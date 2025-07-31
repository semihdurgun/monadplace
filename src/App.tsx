import PixelCanvas from './components/PixelCanvas';
import './App.css'

function App() {

  return (
    <div className="app-container">
      {/* Background */}
      <div className="app-background">
        <div className="stars"></div>
        <div className="nebula"></div>
      </div>

      {/* Main Content */}
      <main className="app-main fade-in">
        <PixelCanvas />
      </main>
    </div>
  );
}


export default App;
