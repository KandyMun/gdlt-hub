import loadingWheel from '/loadingWheel.png'

export default function Spinner() {
  return <img src={loadingWheel} alt="loading" className="w-16 h-16 animate-spin" />
}
