const fieldClass =
  "w-full min-w-0 rounded-xl border-2 border-slate-950 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-indigo-300";
const labelClass = "mb-2 block font-semibold text-slate-900";

export default function Page() {
  async function submitForm(formData) {
    "use server";
    const formFields = {
      email: formData.get("email"),
      message: formData.get("message"),
    };
    console.log("formFields", formFields);
    console.log("TODO: send these form field values to a backend");
  }

  return (
    <main className="mx-auto w-full max-w-6xl rounded-2xl bg-slate-50 px-4 py-8 font-sans sm:px-8 sm:py-10">
      <header className="rounded-2xl border-2 border-slate-950 bg-indigo-600 p-5 shadow-[6px_6px_0_#0f172a] sm:p-9">
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white [text-shadow:2px_2px_0_#0f172a] sm:text-5xl">
          Vill du <span className="text-yellow-300">veta mer?</span>
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-indigo-100">
          Har du frågor eller funderingar? Skicka ett meddelande så hör vi av oss så snart vi kan.
        </p>
      </header>

      <section
        aria-labelledby="kontakt-formular"
        className="mx-auto mt-10 max-w-2xl rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#c7d2fe] sm:p-6"
      >
        <h2 id="kontakt-formular" className="mb-5 flex items-center gap-3 text-xl font-bold tracking-tight text-slate-950">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-slate-950 bg-yellow-300 text-base">
            ✉
          </span>
          Skicka ett meddelande
        </h2>

        <form className="space-y-5" action={submitForm}>
          <div>
            <label htmlFor="email" className={labelClass}>
              E-post
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="namn@exempel.se"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="message" className={labelClass}>
              Meddelande
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              placeholder="Skriv ditt meddelande här"
              className={`${fieldClass} resize-y`}
            />
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl border-2 border-slate-950 bg-yellow-300 px-7 py-3 font-bold text-slate-950 shadow-[3px_3px_0_#0f172a] transition hover:-translate-y-0.5 hover:bg-yellow-200 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 motion-reduce:transform-none sm:w-auto"
          >
            Skicka meddelande <span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>
    </main>
  );
}
