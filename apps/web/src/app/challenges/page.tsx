import { getChallenges } from '@/lib/challenges-service';
import { ChallengeCard } from '@/components/challenges/challenge-card';

export default async function ChallengesPage() {
  const challenges = await getChallenges();

  return (
    <main className="min-h-screen bg-[var(--base)] p-8">
      <div className="max-w-4xl mx-auto text-left">
        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-white/40 mb-1">Lumen quiere aprender</p>
          <h1 className="text-3xl font-semibold text-white">Retos</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(c => (
            <ChallengeCard key={c.id} {...c} />
          ))}
        </div>
      </div>
    </main>
  );
}
