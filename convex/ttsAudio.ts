import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const getAudio = query({
    args: {
        scriptureId: v.string(),
        voiceId: v.string(),
    },
    handler: async (ctx, args): Promise<{ url: string | null; scriptureId: string; voiceId: string } | null> => {
        const entry = await ctx.db
            .query("ttsAudio")
            .withIndex("byScriptureAndVoice", (q) =>
                q.eq("scriptureId", args.scriptureId).eq("voiceId", args.voiceId)
            )
            .first();

        if (!entry) return null;

        const url = await ctx.storage.getUrl(entry.storageId);
        return { url: url ?? null, scriptureId: entry.scriptureId, voiceId: entry.voiceId };
    },
});

export const storeAudio = mutation({
    args: {
        scriptureId: v.string(),
        voiceId: v.string(),
        textHash: v.string(),
        storageId: v.id("_storage"),
        durationMs: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("ttsAudio")
            .withIndex("byScriptureAndVoice", (q) =>
                q.eq("scriptureId", args.scriptureId).eq("voiceId", args.voiceId)
            )
            .first();

        if (existing) {
            await ctx.storage.delete(existing.storageId);
            await ctx.db.patch(existing._id, {
                storageId: args.storageId,
                textHash: args.textHash,
                durationMs: args.durationMs,
                createdAt: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert("ttsAudio", {
            scriptureId: args.scriptureId,
            voiceId: args.voiceId,
            textHash: args.textHash,
            storageId: args.storageId,
            durationMs: args.durationMs,
            createdAt: Date.now(),
        });
    },
});

export const generateAndCache = action({
    args: {
        scriptureId: v.string(),
        text: v.string(),
        voiceId: v.string(),
    },
    handler: async (ctx, args): Promise<string | null> => {
        const apiKey = process.env.ELEVENLABS_SERVER_API_KEY;
        if (!apiKey) {
            throw new Error("ELEVENLABS_SERVER_API_KEY not configured");
        }

        const existing: { url: string | null } | null = await ctx.runQuery(api.ttsAudio.getAudio, {
            scriptureId: args.scriptureId,
            voiceId: args.voiceId,
        });
        if (existing?.url) return existing.url;

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${args.voiceId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey,
                },
                body: JSON.stringify({
                    text: args.text,
                    model_id: "eleven_flash_v2_5",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        use_speaker_boost: true,
                    },
                    output_format: "mp3_44100_128",
                }),
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
        }

        const audioBlob = await response.blob();
        const storageId = await ctx.storage.store(audioBlob);

        const textHash = await hashText(args.text);

        await ctx.runMutation(api.ttsAudio.storeAudio, {
            scriptureId: args.scriptureId,
            voiceId: args.voiceId,
            textHash,
            storageId,
        });

        const url = await ctx.storage.getUrl(storageId);
        return url;
    },
});

async function hashText(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}