import { Navigate, useParams } from 'react-router-dom';

/** /tasks/:id opens that task's drawer over the Today list. */
export function TaskRedirect() {
  const { id } = useParams();
  return <Navigate to={`/tasks?view=today&task=${encodeURIComponent(id ?? '')}`} replace />;
}
