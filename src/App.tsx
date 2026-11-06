import { Workspace } from './workspace/Workspace'
import { WorkspaceProvider } from './workspace/WorkspaceProvider'

export default function App() {
  return (
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  )
}
