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
      continueToNext: 'Continue to: {module}',
      
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
      failed: 'Failed to load image',
      noImage: 'No image set',
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
      inputPlaceholder: 'Type your answer here...',
      tryAgain: 'Try Again',
      yourMission: 'Your Mission',
      missionDescription: 'Complete the following steps to proceed. This is a hands-on activity that will help reinforce your learning.',
      openExternal: 'Open external resource',
      step: 'Step',
      aiValidated: 'AI Validated',
      checking: 'Checking...',
      submitAnswer: 'Submit Answer',
      correct: 'Correct!',
      notQuiteRight: 'Not quite right',
      score: 'Score',
      attemptsMade: '{count} attempt made',
      attemptsMadePlural: '{count} attempts made',
      uploadScreenshot: 'Upload screenshot',
      screenshotUploaded: 'Screenshot uploaded',
      pasteUrl: 'Paste URL here...',
      stepsCompleted: '{completed} of {total} steps completed',
      readyToContinue: 'Ready to continue!',
      completeAllSteps: 'Complete all steps',
      unableToValidate: 'Unable to validate your answer. Please try again.',
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
      loadingAssistant: 'Loading AI assistant...',
      aiPowered: 'AI-powered learning assistance',
      unavailable: 'AI Assistant Unavailable',
      unavailableMessage: 'The AI help feature is currently disabled. You can continue with the course by clicking the button below.',
      personalizedHelp: 'Personalized help based on your quiz results',
      guidedLearning: 'Interactive guided learning',
      askAnything: 'Ask me anything about the material',
      askQuestion: 'Ask a question about the concepts...',
      continueConversation: 'Continue the conversation...',
      reachedLimit: 'You\'ve reached the conversation limit. Click continue to proceed.',
      messages: 'messages',
      askMoreToontinue: 'ask at least {count} more to continue',
    },
    
    checkpoint: {
      checking: 'Checking your progress...',
      passed: 'Passed!',
      failed: 'Check Failed',
      passedMessage: 'You met the requirements. Continue!',
      failedMessage: 'You haven\'t met the requirements yet.',
      continue: 'Continue',
      evaluating: 'Evaluating Progress',
      checkingUnderstanding: 'Checking your understanding...',
      yourScore: 'Your Score',
      getHelp: 'Get Help',
      tryAgain: 'Try Again',
      messages: {
        greatProgress: 'Great progress! You can continue to the next section.',
        excellentWork: 'Excellent work! You scored {score}% and demonstrated strong understanding.',
        goodJob: 'Good job! You scored {score}%. You can continue, but consider reviewing the material.',
        needsReview: 'You scored {score}%. Let\'s review the concepts you found challenging.',
        multipleAttempts: 'After {attempts} attempts, let\'s take a different approach and get some personalized help.',
        focusOn: 'We\'ll focus on: {topics}.',
      },
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
      problem: 'Problem',
      hideHints: 'Hide hints',
      showHints: 'Show hints',
      hide: 'Hide',
      show: 'Show',
      explanation: 'Explanation',
      solutionWritten: 'Solution written',
      solutionViewed: 'Solution viewed',
      writeOrView: 'Write your solution or view the answer',
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
