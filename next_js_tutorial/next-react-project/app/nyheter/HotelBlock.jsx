// "use client";

// import Image from "next/image";

// export default function HotelBlock({id, name, capacity, avgCost}) {
//   const imageLoader = ({src}) => {
//     return `./nyheter/${src}.jpeg`
//   }
//   return(
//     <div className="mx-auto p-4 sm:p-6">
//       <h2 className="text-xl text-red-400">
//         {name} <span className="text-blue-400">(${avgCost})</span>
//       </h2>
      
//       <p>
//         {capacity} rooms  
//       </p>
//         <Image 
//         src={id} 
//         width={300} 
//         height={300} 
//         loader={imageLoader}
//         alt="Pic of hotel"
//         className="my-3 h-auto w-full max-w-[300px] rounded-lg"/>
//       <hr></hr>                
//     </div>
//   )
// }