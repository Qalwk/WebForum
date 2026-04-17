import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/router'
import { SessionProvider } from './entities/session/model/session-context'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App
