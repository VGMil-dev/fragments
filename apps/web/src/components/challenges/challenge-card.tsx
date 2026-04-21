import Link from 'next/link';

interface Props {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  topic: string;
}

const DIFFICULTY_LABEL = ['', 'Principiante', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];
const DIFFICULTY_COLOR = ['', 'text-emerald-400', 'text-sky-400', 'text-amber-400', 'text-orange-400', 'text-red-400'];

export function ChallengeCard({ id, title, description, difficulty, topic }: Props) {
  return (
    <Link href={`/challenges/${id}`} className="block bento soft-stroke p-5 hover:scale-[1.01] transition-transform text-left">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] tracking-widest uppercase text-white/40">{topic}</span>
        <span className={`text-[11px] font-medium ${DIFFICULTY_COLOR[difficulty]}`}>
          {'◆'.repeat(difficulty)}{'◇'.repeat(5 - difficulty)}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-white/50 line-clamp-2">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-white/30">
        <span>{DIFFICULTY_LABEL[difficulty]}</span>
      </div>
    </Link>
  );
}
