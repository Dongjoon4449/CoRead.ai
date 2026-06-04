import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>C</span>
        <span className={styles.logoText}>ColoRead</span>
      </div>
      <ul className={styles.links}>
        {['How It Works', 'About'].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </nav>
  )
}
