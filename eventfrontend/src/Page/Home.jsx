import React from "react";
import Header from "../component/header";
import Hero from "../component/hero";
import BrowseEvents from "../component/broweEvents";
import Footer from "../component/footer";

const Home = () => {
        return(
          <>
          <Header/>
            <Hero/>
            <BrowseEvents/>
            <Footer/>

          </>
        );
    };
export default Home;