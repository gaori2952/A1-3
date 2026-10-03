export function removeOwnedProject(state, projectId, userId) {
  if (!state.projects.some(project => project.id === projectId && project.user_id === userId)) return null;
  return { ...state,
    projects: state.projects.filter(project => project.id !== projectId),
    tasks: state.tasks.filter(task => task.project_id !== projectId),
    issues: state.issues.filter(issue => issue.project_id !== projectId)
  };
}

