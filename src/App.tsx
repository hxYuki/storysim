import type { Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';

import GamePage from './pages/game';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1 class="text-3xl font-bold underline">
          The Simulator
        </h1>

        <GamePage />
      </header>
    </div>
  );
};

export default App;
