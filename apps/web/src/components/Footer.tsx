import Link from "next/link";
import { Brand } from "./Brand";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <Brand light />
            <p>
              Good things for great spaces.
              <br />
              Sanitary ware, bathroom fittings & paints.
            </p>
          </div>
          <div>
            <h3>Make it yours</h3>
            <Link href="/shop">Shop all products</Link>
            <Link href="/category/sanitary">Bathroom essentials</Link>
            <Link href="/category/paints">Paints & finishes</Link>
          </div>
          <div>
            <h3>Your Matrizo</h3>
            <Link href="/account">My account</Link>
            <Link href="/orders">Track your orders</Link>
            <Link href="/cart">Your cart</Link>
            <Link href="/support">Help & support</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/delete-account">Delete account</Link>
          </div>
          <div>
            <h3>Behind the scenes</h3>
            <a href="https://emp.matrizo.com">Employee portal ↗</a>
            <a href="https://adminacc.matrizo.com">Admin portal ↗</a>
            <p>Built around your next project.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Matrizo | All rights reserved.
          </span>
          <span>Thoughtful choices. Beautiful spaces.</span>
        </div>
      </div>
    </footer>
  );
}
