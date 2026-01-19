// English translations for admin interface
export const en = {
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: 'Enter your password',
    createAccount: 'Create Account',
    platformTitle: 'Learning Hub',
    platformSubtitle: 'Master AI through interactive journeys',
    termsText: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
    loading: 'Loading...',
  },
  
  dashboard: {
    title: 'Learning Hub',
    subtitle: 'Your AI-powered learning journey',
    signOut: 'Sign Out',
    continueLearning: 'Continue Learning',
    pickUpMessage: 'Pick up where you left off or start a new track',
    
    stats: {
      completed: 'Completed',
      inProgress: 'In Progress',
      streak: 'Learning Streak',
      days: 'days',
    },
    
    empty: {
      title: 'No tracks available',
      message: 'Get started by creating your first learning track',
      createButton: 'Create Sample Track',
      creating: 'Creating...',
    },
    
    loading: 'Loading...',
  },
  
  track: {
    levels: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    },
    
    min: 'min',
    module: 'module',
    modules: 'modules',
    
    notAvailable: 'Not Available',
    startLearning: 'Start Learning',
    continue: 'Continue',
    review: 'Review',
    
    progress: 'Progress',
    completed: 'Completed',
  },
  
  journey: {
    exit: 'Exit',
    loading: 'Loading your journey...',
    
    error: {
      title: 'Unable to Load Journey',
      noVersion: 'No journey version specified',
      notFound: 'Journey not found',
      failed: 'Failed to load journey',
      tryAgain: 'Try Again',
      backToDashboard: 'Back to Dashboard',
    },
    
    completion: {
      title: 'Journey Complete!',
      congratulations: 'Congratulations! You\'ve successfully completed this learning journey.',
      backToDashboard: 'Back to Dashboard',
      restart: 'Restart Journey',
      
      stats: {
        blocksCompleted: 'Blocks Completed',
        averageScore: 'Average Score',
        timeSpent: 'Time Spent',
      },
    },
  },
  
  blocks: {
    continue: 'Continue',
    submit: 'Submit',
    next: 'Next',
    previous: 'Previous',
    retry: 'Retry',
    complete: 'Complete',
    markComplete: 'Mark as Complete',
    loading: 'Loading...',
    
    read: {
      continue: 'Continue',
    },
    
    video: {
      loading: 'Loading video...',
      continue: 'Continue',
    },
    
    image: {
      loading: 'Loading image...',
      continue: 'Continue',
    },
    
    quiz: {
      question: 'Question',
      of: 'of',
      selectAnswer: 'Select your answer',
      submit: 'Submit',
      next: 'Next',
      retry: 'Retry',
      
      result: {
        yourScore: 'Your Score',
        correct: 'Correct',
        incorrect: 'Incorrect',
        passed: 'Passed!',
        failed: 'Not Passed',
        passedMessage: 'Great job! You passed the quiz.',
        failedMessage: 'You didn\'t meet the passing score. Try again!',
        explanation: 'Explanation',
      },
      
      previousAttempt: 'Your Previous Attempt',
      retakeQuiz: 'Retake Quiz',
    },
    
    mission: {
      steps: 'Steps',
      completed: 'Completed',
      pending: 'Pending',
      submit: 'Submit Mission',
      answer: 'Your Answer',
      answerPlaceholder: 'Enter your answer here...',
    },
    
    form: {
      submit: 'Submit',
      required: 'Required',
      text: 'Text',
      email: 'Email',
      number: 'Number',
      textarea: 'Long Text',
      select: 'Select',
      checkbox: 'Checkbox',
      radio: 'Radio',
    },
    
    aiHelp: {
      title: 'AI Help',
      askForHelp: 'Ask for Help',
      send: 'Send',
      inputPlaceholder: 'Ask your question here...',
      thinking: 'Thinking...',
      continue: 'Continue',
    },
    
    checkpoint: {
      checking: 'Checking your progress...',
      passed: 'Passed!',
      failed: 'Check Failed',
      passedMessage: 'You met the requirements. Continue!',
      failedMessage: 'You haven\'t met the requirements yet.',
      continue: 'Continue',
    },
    
    animation: {
      playing: 'Playing...',
      continue: 'Continue',
    },
    
    code: {
      copy: 'Copy',
      copied: 'Copied!',
      continue: 'Continue',
    },
    
    exercise: {
      yourSolution: 'Your Solution',
      placeholder: 'Write your solution here...',
      hints: 'Hints',
      showHint: 'Show Hint',
      solution: 'Solution',
      showSolution: 'Show Solution',
      hideSolution: 'Hide Solution',
      submit: 'Submit Solution',
    },
    
    resource: {
      resources: 'Resources',
      view: 'View',
      download: 'Download',
      viewedAll: 'You\'ve viewed all resources',
      continue: 'Continue',
    },
  },
  
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    home: 'Home',
  },
} as const;

export type TranslationKeys = typeof en;
