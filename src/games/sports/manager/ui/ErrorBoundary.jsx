import React from 'react';

/** Keeps one broken screen from taking the whole career down with it. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('[manager]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const es = this.props.lang !== 'en';
    return (
      <div className="mg-empty mg-crash" role="alert">
        <strong>{es ? 'Algo ha fallado en esta pantalla' : 'Something went wrong on this screen'}</strong>
        <p>{es ? 'Tu partida está guardada. Vuelve a la central para seguir.' : 'Your career is saved. Go back home to continue.'}</p>
        <button type="button" className="mg-btn mg-btn--primary" onClick={() => { this.setState({ error: null }); this.props.onReset?.(); }}>
          {es ? 'Volver a la central' : 'Back to home'}
        </button>
      </div>
    );
  }
}
