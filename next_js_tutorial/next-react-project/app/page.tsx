import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between px-4 py-12 bg-white dark:bg-black sm:items-start sm:px-16 sm:py-32">
        <h1 className="text-2xl font-bold sm:text-3xl">Här skall vara översikt som startsida</h1>
      </main>
    </div>
  );
}
