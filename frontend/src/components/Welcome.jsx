export default function Welcome({ onGetStarted }) {
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <h1>Welcome to NotePulse</h1>
        <p>A collaborative note editor powered by real-time synchronization</p>
        <button onClick={onGetStarted} className="cta-button">
          Get Started
        </button>
      </div>
    </div>
  );
}
