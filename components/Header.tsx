import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Keychain home">
          <span className="brand-mark">
            <Icon name="music" />
          </span>
          <span>Keychain</span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/">Planner</Link>
          <Link href="/compare">Compare tracks</Link>
        </nav>
        <span className="header-note">
          <Icon name="lock" /> Analysis stays on your device
        </span>
      </div>
    </header>
  );
}
