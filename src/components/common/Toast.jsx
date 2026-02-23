import { useAppContext } from '../../context/AppContext'
import './Toast.css'

export default function Toast() {
  const { toast } = useAppContext()

  return (
    <div className={`toast ${toast.type}${toast.visible ? '' : ' hidden'}`}>
      {toast.msg}
    </div>
  )
}
