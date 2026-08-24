-- Voice feedback now stores the client-side transcript instead of audio.
-- Make audioUrl optional and require transcript.

ALTER TABLE "VoiceFeedback" ALTER COLUMN "audioUrl" DROP NOT NULL;

ALTER TABLE "VoiceFeedback" ALTER COLUMN "transcript" SET NOT NULL;
