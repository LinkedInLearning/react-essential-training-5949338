import { useState, useReducer, useEffect } from 'react';
import './App.css'
import chef from "./gifs/chef.gif"


let smiley = "😋";

function Header({name, openStatus, toggle}) {
  
  return (
    <header>
      <h1>{name}'s Kitchen {smiley} </h1>
      <h3>
        The restaurant is currently{" "} 
        <span style={{color: openStatus ? "green" : "red" }}>
          {openStatus ? "Open" : "Closed"}
        </span>
      </h3>
      <button onClick={toggle}>
          {openStatus  ? "Close" : "Open"} Restaurant
      </button>
    </header>
  );
}

const items = [
  "Macaroni and Cheese",
  "Salmon with Potatoes",
  "Tofu with Vegetables",
  "Minestrone Soup"
];

// map((element, index))

const dishObjects = items.map((dish, i) => ({
  id: i,
  title: dish
}));

function Main({ dishes, year }) {
  return(
    <main>
      <img 
        src={chef} 
        height={350} alt='A gif of me (Rasti) as a Chef with moving forks'
      />
      
      

      {/* <img src="https://github.com/itsar-t.png" height={200} alt='A photo of a smiling chef'/> */}
      <ul>
        {dishes.map((dish) => <li key={dish.id}  style={{ listStyleType: "none"}}>{dish.title}</li>)}
      </ul>

      <p>@Copyright {year}</p> 
    </main>
  );
}

function App() {
  const [owner, setOwner] = useState("Rasti");
  const [status, toggle] = useReducer(
    (status) => !status, true
  );

  useEffect(() => {
    console.log(`The restaurant is ${status ? "Open" : "Closed" }`)
  }, [status]);

  return (
    <>
      <main id="center">
        <Header name={owner} openStatus={status} toggle={toggle} />
        <Main dishes={dishObjects} year={new Date().getFullYear()}/>
      </main>
    </>
  );
}

export default App
