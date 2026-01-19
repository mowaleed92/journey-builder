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
    markComplete: 'وضع علامة كمكتمل',
    loading: 'جاري التحميل...',
    
    read: {
      continue: 'متابعة',
    },
    
    video: {
      loading: 'جاري تحميل الفيديو...',
      continue: 'متابعة',
    },
    
    image: {
      loading: 'جاري تحميل الصورة...',
      continue: 'متابعة',
    },
    
    quiz: {
      question: 'سؤال',
      of: 'من',
      selectAnswer: 'اختر الإجابة',
      submit: 'إرسال',
      next: 'التالي',
      retry: 'إعادة المحاولة',
      
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
    },
    
    checkpoint: {
      checking: 'جاري التحقق من تقدمك...',
      passed: 'تم النجاح!',
      failed: 'التحقق فشل',
      passedMessage: 'لقد استوفيت المتطلبات. استمر!',
      failedMessage: 'لم تستوف المتطلبات بعد.',
      continue: 'متابعة',
    },
    
    animation: {
      playing: 'جاري التشغيل...',
      continue: 'متابعة',
    },
    
    code: {
      copy: 'نسخ',
      copied: 'تم النسخ!',
      continue: 'متابعة',
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
