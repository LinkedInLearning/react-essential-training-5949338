export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Nyheter</h1>
      </div>
    </main>
  );
}



// import { cacheLife } from "next/cache";
// import HotelBlock from "./HotelBlock"

// async function getData() {
//   "use cache";
//   cacheLife("hours");
//   const response = await fetch("https://snowtooth-hotel-api.fly.dev");
//   return response.json();
// }


// export default async function Page() {
//   const data = await getData();
//   return (
//     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between px-4 py-10 bg-white dark:bg-black sm:items-start sm:px-16 sm:py-32">
//         <h1 className="text-xl text-amber-600">Här skall nyheter komma</h1>
//         <div className="mt-5 w-full rounded-xl border border-slate-200 shadow-sm">
        
//           {data.map((hotel) => (
//             <HotelBlock 
//             key={hotel.id}
//             id={hotel.id} 
//             name={hotel.name} 
//             capacity={hotel.capacity} 
//             avgCost={hotel.avgCost} />
//           ))}
//         </div>
//       </main>
//     </div>
//   );
// }