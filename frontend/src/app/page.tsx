import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Food Opt</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Planificación de comidas optimizada por costo, variedad y tiempo de preparación.</p>
      <Link href="/preferences" className="rounded bg-black px-4 py-2 text-white">
        Ir a preferencias
      </Link>
    </main>
  );
}
