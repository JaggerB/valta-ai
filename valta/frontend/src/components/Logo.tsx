interface LogoProps {
  className?: string
  size?: number
}

export default function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <img
      src="/valta-logo.png"
      alt="Valta Logo"
      width={size}
      height={size}
      className={className}
    />
  )
}
