import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TooltipProvider, Toaster } from '@/components/ui'
import { HomePage, LandingPage, ProjectsPage, EditorPage, ProfilePage } from '@/pages'

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/editor/:projectId" element={<EditorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
