// Follow-up questions from AI drafting, handed from the voice flow to the wizard for one session.
const notes = new Map<string, string[]>();

export const aiNotes = {
  set: (campaignId: string, questions: string[]) => notes.set(campaignId, questions),
  take: (campaignId: string) => {
    const q = notes.get(campaignId) ?? [];
    notes.delete(campaignId);
    return q;
  },
};
