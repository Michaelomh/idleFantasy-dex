export function InstallNotice() {
  return (
    <div className="rounded-card border border-notice-border bg-notice-bg p-4 text-left text-notice-text">
      <p className="body text-center font-bold text-primary">Recommended: Install the app</p>
      <p className="body mt-1">
        Installing opens the dashboard in its own window, like a normal app, and lets it work offline.
      </p>
      <ul className="body mt-1 list-disc space-y-1 pl-4">
        <li>
          <span className="font-bold">Chrome on Android:</span> tap the three-dot menu, then "Install app".
        </li>
        <li>
          <span className="font-bold">Brave on Android:</span> tap the three-dot menu, then "Add to Home screen" or
          "Install app".
        </li>
      </ul>
    </div>
  );
}
