// Arabic translations for user-facing interface
export const ar = {
  auth: {
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    emailPlaceholder: 'your@example.com',
    passwordPlaceholder: 'أدخل كلمة المرور',
    createAccount: 'إنشاء حساب',
    platformTitle: 'منصة التعلم',
    platformSubtitle: 'أتقن الذكاء الاصطناعي من خلال رحلات تفاعلية',
    termsText: 'بالمتابعة، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.',
    loading: 'جاري التحميل...',
  },
  
  dashboard: {
    title: 'منصة التعلم',
    subtitle: 'رحلتك التعليمية المدعومة بالذكاء الاصطناعي',
    signOut: 'تسجيل الخروج',
    continueLearning: 'متابعة التعلم',
    pickUpMessage: 'تابع من حيث توقفت أو ابدأ مسارًا جديدًا',
    
    stats: {
      completed: 'مكتمل',
      inProgress: 'قيد التقدم',
      streak: 'سلسلة التعلم',
      days: 'أيام',
    },
    
    empty: {
      title: 'لا توجد مسارات متاحة',
      message: 'ابدأ بإنشاء مسار التعلم الأول الخاص بك',
      createButton: 'إنشاء مسار تجريبي',
      creating: 'جاري الإنشاء...',
    },
    
    loading: 'جاري التحميل...',
  },
  
  track: {
    levels: {
      beginner: 'مبتدئ',
      intermediate: 'متوسط',
      advanced: 'متقدم',
    },
    
    min: 'دقيقة',
    module: 'وحدة',
    modules: 'وحدات',
    
    notAvailable: 'غير متاح',
    startLearning: 'ابدأ التعلم',
    continue: 'متابعة',
    review: 'مراجعة',
    
    progress: 'التقدم',
    completed: 'مكتمل',
  },
  
  journey: {
    exit: 'خروج',
    loading: 'جاري تحميل رحلتك...',
    
    error: {
      title: 'غير قادر على تحميل الرحلة',
      noVersion: 'لم يتم تحديد إصدار الرحلة',
      notFound: 'الرحلة غير موجودة',
      failed: 'فشل تحميل الرحلة',
      tryAgain: 'حاول مرة أخرى',
      backToDashboard: 'العودة إلى لوحة التحكم',
    },
    
    completion: {
      title: 'الرحلة مكتملة!',
      congratulations: 'تهانينا! لقد أكملت هذه الرحلة التعليمية بنجاح.',
      backToDashboard: 'العودة إلى لوحة التحكم',
      restart: 'إعادة بدء الرحلة',
      continueToNext: 'المتابعة إلى: {module}',
      
      stats: {
        blocksCompleted: 'المهام المكتملة',
        averageScore: 'متوسط النتيجة',
        timeSpent: 'الوقت المستغرق',
      },
    },
  },
  
  blocks: {
    continue: 'متابعة',
    submit: 'إرسال',
    next: 'التالي',
    previous: 'السابق',
    retry: 'إعادة المحاولة',
    complete: 'إكمال',
    completed: 'مكتمل',
    markComplete: 'وضع علامة كمكتمل',
    loading: 'جاري التحميل...',
    
    read: {
      continue: 'متابعة',
    },
    
    video: {
      loading: 'جاري تحميل الفيديو...',
      continue: 'متابعة',
      skipVideo: 'تخطي الفيديو',
      slowLoading: 'الفيديو يستغرق وقتاً طويلاً في التحميل...',
      unavailable: 'الفيديو غير متاح',
      unavailableDesc: 'تعذر تحميل هذا الفيديو. قد يكون الملف بتنسيق غير مدعوم أو الرابط غير صحيح.',
      continueAnyway: 'متابعة على أي حال',
      watchToComplete: 'شاهد الفيديو للمتابعة',
      showTranscript: 'إظهار النص',
      hideTranscript: 'إخفاء النص',
      noSupport: 'متصفحك لا يدعم تشغيل الفيديو.',
    },
    
    image: {
      loading: 'جاري تحميل الصورة...',
      continue: 'متابعة',
      failed: 'فشل تحميل الصورة',
      noImage: 'لم يتم تعيين صورة',
    },
    
    quiz: {
      question: 'سؤال',
      of: 'من',
      selectAnswer: 'اختر الإجابة',
      submit: 'إرسال',
      next: 'التالي',
      retry: 'إعادة المحاولة',
      topicsToReview: 'مواضيع للمراجعة:',
      
      result: {
        yourScore: 'نتيجتك',
        correct: 'صحيح',
        incorrect: 'خطأ',
        passed: 'نجحت!',
        failed: 'لم تنجح',
        passedMessage: 'أحسنت! لقد اجتزت الاختبار.',
        failedMessage: 'لم تصل إلى الحد الأدنى للنجاح. حاول مرة أخرى!',
        explanation: 'شرح',
      },
      
      previousAttempt: 'محاولتك السابقة',
      retakeQuiz: 'إعادة الاختبار',
    },
    
    mission: {
      steps: 'الخطوات',
      completed: 'مكتمل',
      pending: 'قيد الانتظار',
      submit: 'إرسال المهمة',
      answer: 'إجابتك',
      answerPlaceholder: 'أدخل إجابتك هنا...',
      inputPlaceholder: 'اكتب إجابتك هنا...',
      tryAgain: 'حاول مرة أخرى',
      yourMission: 'مهمتك',
      missionDescription: 'أكمل الخطوات التالية للمتابعة. هذا نشاط عملي سيساعد في تعزيز تعلمك.',
      openExternal: 'فتح المصدر الخارجي',
      step: 'الخطوة',
      aiValidated: 'تم التحقق بالذكاء الاصطناعي',
      checking: 'جاري التحقق...',
      submitAnswer: 'إرسال الإجابة',
      correct: 'صحيح!',
      notQuiteRight: 'ليس صحيحاً تماماً',
      score: 'النتيجة',
      attemptsMade: '{count} محاولة',
      attemptsMadePlural: '{count} محاولات',
      uploadScreenshot: 'رفع لقطة الشاشة',
      screenshotUploaded: 'تم رفع لقطة الشاشة',
      pasteUrl: 'الصق الرابط هنا...',
      stepsCompleted: '{completed} من {total} خطوات مكتملة',
      readyToContinue: 'جاهز للمتابعة!',
      completeAllSteps: 'أكمل جميع الخطوات',
      unableToValidate: 'غير قادر على التحقق من إجابتك. يرجى المحاولة مرة أخرى.',
    },
    
    form: {
      submit: 'إرسال',
      required: 'مطلوب',
      text: 'نص',
      email: 'بريد إلكتروني',
      number: 'رقم',
      textarea: 'نص طويل',
      select: 'اختيار',
      checkbox: 'خانة اختيار',
      radio: 'اختيار واحد',
    },
    
    aiHelp: {
      title: 'المساعدة بالذكاء الاصطناعي',
      askForHelp: 'اطلب المساعدة',
      send: 'إرسال',
      inputPlaceholder: 'اسأل سؤالك هنا...',
      thinking: 'جاري التفكير...',
      continue: 'متابعة',
      loadingAssistant: 'جاري تحميل المساعد الذكي...',
      aiPowered: 'مساعدة تعليمية مدعومة بالذكاء الاصطناعي',
      unavailable: 'المساعد الذكي غير متاح',
      unavailableMessage: 'ميزة المساعدة الذكية معطلة حالياً. يمكنك المتابعة في الدورة بالنقر على الزر أدناه.',
      personalizedHelp: 'مساعدة مخصصة بناءً على نتائج الاختبار',
      guidedLearning: 'تعلم تفاعلي موجه',
      askAnything: 'اسألني أي شيء عن المادة',
      askQuestion: 'اطرح سؤالاً عن المفاهيم...',
      continueConversation: 'تابع المحادثة...',
      reachedLimit: 'لقد وصلت إلى الحد الأقصى للمحادثة. انقر متابعة للمتابعة.',
      messages: 'رسائل',
      askMoreToontinue: 'اطرح {count} سؤال إضافي على الأقل للمتابعة',
    },
    
    checkpoint: {
      checking: 'جاري التحقق من تقدمك...',
      passed: 'تم النجاح!',
      failed: 'التحقق فشل',
      passedMessage: 'لقد استوفيت المتطلبات. استمر!',
      failedMessage: 'لم تستوف المتطلبات بعد.',
      continue: 'متابعة',
      evaluating: 'جاري تقييم تقدمك',
      checkingUnderstanding: 'جاري التحقق من فهمك...',
      yourScore: 'نتيجتك',
      getHelp: 'احصل على مساعدة',
      tryAgain: 'حاول مرة أخرى',
      messages: {
        greatProgress: 'تقدم رائع! يمكنك المتابعة إلى القسم التالي.',
        excellentWork: 'عمل ممتاز! لقد حصلت على {score}% وأظهرت فهماً قوياً.',
        goodJob: 'أحسنت! لقد حصلت على {score}%. يمكنك المتابعة، لكن ننصح بمراجعة المادة.',
        needsReview: 'لقد حصلت على {score}%. لنراجع المفاهيم التي وجدتها صعبة.',
        multipleAttempts: 'بعد {attempts} محاولات، لنجرب طريقة مختلفة ونحصل على مساعدة شخصية.',
        focusOn: 'سنركز على: {topics}.',
      },
    },
    
    animation: {
      playing: 'جاري التشغيل...',
      continue: 'متابعة',
      lottieLabel: 'رسوم متحركة Lottie: {url}',
      interactiveLabel: 'رسوم متحركة تفاعلية',
    },
    
    code: {
      copy: 'نسخ',
      copied: 'تم النسخ!',
      continue: 'متابعة',
    },

    resource: {
      viewedProgress: 'تم الاطلاع على {viewed} من {total}',
      empty: 'لا توجد موارد متاحة',
      download: 'تنزيل',
      allViewed: 'تم الاطلاع على جميع الموارد!',
      remainingSingle: 'مورد واحد متبقٍ',
      remainingMultiple: 'متبقٍ {count} موارد',
    },
    
    exercise: {
      yourSolution: 'حلك',
      placeholder: 'اكتب حلك هنا...',
      hints: 'تلميحات',
      showHint: 'إظهار تلميح',
      solution: 'الحل',
      showSolution: 'إظهار الحل',
      hideSolution: 'إخفاء الحل',
      submit: 'إرسال الحل',
      problem: 'المشكلة',
      hideHints: 'إخفاء التلميحات',
      showHints: 'إظهار التلميحات',
      hide: 'إخفاء',
      show: 'إظهار',
      explanation: 'الشرح',
      solutionWritten: 'تم كتابة الحل',
      solutionViewed: 'تم عرض الحل',
      writeOrView: 'اكتب حلك أو اعرض الإجابة',
    },
    
    resource: {
      resources: 'الموارد',
      view: 'عرض',
      download: 'تحميل',
      viewedAll: 'لقد شاهدت جميع الموارد',
      continue: 'متابعة',
    },
  },
  
  common: {
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    back: 'رجوع',
    home: 'الرئيسية',
  },
} as const;

export type TranslationKeys = typeof ar;
