import React from 'react';
import { getHomeMessage } from '../controllers/homeController';

const HomePage = () => {
  const message = getHomeMessage();

  return (
    <div className="HomePage">
      <h1>{message}</h1>
      <p>
        Edit <code>src/pages/HomePage.js</code> to customize this page.
      </p>
      <button className="btn-primary">Primary action</button>
    </div>
  );
};

export default HomePage;


