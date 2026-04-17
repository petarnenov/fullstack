import { Component, Suspense, type ReactNode } from "react";
import styles from "./MfeBoundary.module.css";

interface Props {
  label: string;
  fallbackHeight?: number;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class MfeBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(`[MfeBoundary:${this.props.label}]`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.error} role="alert">
          <strong>Couldn't load {this.props.label}.</strong>
          <div className={styles.detail}>{this.state.error.message}</div>
        </div>
      );
    }

    const fallback = (
      <div
        className={styles.loading}
        style={{ minHeight: this.props.fallbackHeight ?? 80 }}
      >
        Loading {this.props.label}…
      </div>
    );

    return <Suspense fallback={fallback}>{this.props.children}</Suspense>;
  }
}
