/** js-dos는 CDN에서 전역으로 실린다. 실제로 쓰는 부분만 선언한다. */
declare global {
  interface Window {
    Dos: (
      element: HTMLElement,
      options: { url: string; autoStart?: boolean; renderBackend?: string },
    ) => { stop: () => void };
  }
}

export {};
