/**
 * AYOS Terms of Service and Privacy Policy.
 *
 * DRAFT: written from how the platform works today, for review by a Philippine lawyer
 * before launch. Before these take effect, fill in LEGAL_META (operator name, address,
 * data protection officer) and replace the draft notice in LegalPage.
 */

export const LEGAL_META = {
  status: 'draft' as 'draft' | 'final',
  version: 'Draft 1',
  updated: '2026-11-14',
  contactEmail: 'hello@ayos.ph',
}

export type LegalBlock = string | { list: string[] }

export interface LegalSection {
  id: string
  title: string
  /** One or two plain sentences shown above the full text. */
  summary: string
  body: LegalBlock[]
}

export interface LegalDocument {
  slug: 'terms' | 'privacy'
  path: '/terms' | '/privacy'
  title: string
  navLabel: string
  intro: string
  sections: LegalSection[]
}

const email = LEGAL_META.contactEmail

export const termsOfService: LegalDocument = {
  slug: 'terms',
  path: '/terms',
  title: 'Terms of Service',
  navLabel: 'Terms',
  intro: 'These terms explain how AYOS works and what we expect from customers and providers. Please read them before you create an account.',
  sections: [
    {
      id: 'about-ayos',
      title: 'About AYOS',
      summary: 'AYOS connects customers with independent local service providers. We run the platform; providers do the work.',
      body: [
        'AYOS ("AYOS", "we", "us") is an online marketplace in the Philippines. It helps customers find local service providers for home, repair, installation, and technical work, and helps providers manage requests and jobs.',
        'Providers on AYOS are independent. They are not our employees, agents, or partners. When a customer and a provider agree on a job, the agreement for the service is between them. AYOS is not a party to that agreement and does not perform the service.',
        'By creating an account or using AYOS, you agree to these terms and to our Privacy Policy. If you do not agree, please do not use AYOS.',
      ],
    },
    {
      id: 'accounts',
      title: 'Your account',
      summary: 'One account works for both customer and provider use. You must be 18 or older and keep your sign-in safe.',
      body: [
        'You need an account to request services or offer them. Each person may hold one account. The same account lets you book services as a customer and, after approval, offer services as a provider.',
        { list: [
          'You must be at least 18 years old and able to enter into a binding agreement.',
          'Give your real name, a working email address, and a mobile number you control. Keep them up to date.',
          'Verify your email address before you use the marketplace.',
          'Keep your password private. You can turn on two-step verification and sign out other devices from your security settings.',
          'Tell us right away at ' + email + ' if you think someone else used your account.',
        ] },
        'You are responsible for activity that happens under your account, unless it happened because of our own failure to protect it.',
      ],
    },
    {
      id: 'customers',
      title: 'Requesting a service',
      summary: 'Send a clear request to one provider. Your exact address is shared only after the provider accepts.',
      body: [
        'As a customer, you can search for approved providers by service and city, and send a request to a provider. A request includes the service you need, a description, an optional preferred time, optional photos, and one of your saved addresses.',
        'Before a provider accepts, they see only a broad area such as your barangay or city. After they accept, they see the service address so they can do the job. Request photos are shown only to the provider you sent the request to.',
        { list: [
          'Describe the work honestly, and make sure you have the right to have it done at that address.',
          'Be present, or arrange access, at the agreed time.',
          'You may cancel a job online while it is accepted or scheduled. After work has started, contact the provider or open a dispute instead.',
          'When the provider marks the work finished, confirm completion only if the work was done. Only you can confirm it.',
        ] },
      ],
    },
    {
      id: 'providers',
      title: 'Offering services',
      summary: 'Providers apply, get reviewed, and then manage their own services, areas, and jobs.',
      body: [
        'Any verified account can apply to become a provider. Applications start as pending. We may ask for verification documents, and we may approve, decline, or later suspend a provider account. Approval means you passed our basic checks. It is not a licence, guarantee, or endorsement of your work.',
        { list: [
          'Offer only services you are qualified, and where required licensed, to perform.',
          'Keep your profile, service categories, service areas, photos, and availability accurate.',
          'Post only photos of your own work, or photos you have permission to use.',
          'Use a customer’s address and details only to do the job they booked.',
          'Follow the job steps in AYOS: accept, schedule, start, and mark finished.',
          'You are responsible for your own taxes, permits, tools, insurance, and the safety of your work.',
        ] },
      ],
    },
    {
      id: 'fees',
      title: 'Fees and payments',
      summary: 'Customers pay providers directly. Providers use AYOS free for their first 10 customers, then may need to pay an activation fee.',
      body: [
        'AYOS does not collect payment for services. The customer and the provider agree on the price and how it is paid. Settle the price before work starts.',
        'Creating an account and sending requests is free for customers.',
        'Providers can serve up to 10 different customers with confirmed completed jobs for free. After that, new requests pause until the provider account is activated. Existing jobs, messages, and records stay available. If an activation fee applies, we will show the amount before you pay, and you submit your payment reference in the provider workspace for our team to review.',
        'We may change fees in the future. We will tell providers before a change applies to them. Fees already paid are not refundable unless the law requires it or we made a mistake.',
      ],
    },
    {
      id: 'messages',
      title: 'Messages and contact details',
      summary: 'Keep first contact on AYOS. Phone numbers, emails, and chat links are hidden until a booking is accepted.',
      body: [
        'Customers and providers can message each other in AYOS. Before a booking is accepted, AYOS automatically hides phone numbers, email addresses, and chat-app links in messages. This protects both sides from spam and from deals that skip the safety features of the platform.',
        'Do not use messages to harass, threaten, scam, or advertise. You can report a message, and our team may review it and hide it.',
      ],
    },
    {
      id: 'reviews',
      title: 'Reviews',
      summary: 'Only the customer of a completed job can leave one review. Keep it honest.',
      body: [
        'After a customer confirms that a job is complete, they can leave one rating and an optional comment. Reviews appear on the provider’s public profile.',
        'Reviews must describe your real experience. Do not post reviews for yourself, pay for reviews, or pressure a customer to change a review. We may hide reviews that break these terms or the law.',
      ],
    },
    {
      id: 'conduct',
      title: 'Things you must not do',
      summary: 'Use AYOS honestly and safely. Breaking these rules can lead to suspension.',
      body: [
        { list: [
          'Give false information, pretend to be someone else, or create more than one account to avoid a suspension.',
          'Post illegal, harmful, discriminatory, or sexual content, or someone else’s personal data.',
          'Ask for or offer services that are illegal or unsafe.',
          'Collect other users’ information, or use it for anything other than the booked job.',
          'Try to get around contact masking, the free customer limit, or other platform rules.',
          'Interfere with AYOS: scrape it, overload it, test it for weaknesses without permission, or bypass security checks.',
        ] },
      ],
    },
    {
      id: 'content',
      title: 'Your content',
      summary: 'You own what you post. You let AYOS show it so the marketplace works.',
      body: [
        'You keep ownership of the text and photos you add to AYOS, such as your provider profile, portfolio, request photos, messages, and reviews.',
        'You give AYOS a non-exclusive, royalty-free licence to store, display, and resize that content only as needed to run and promote the marketplace. For example, we may show a provider’s public profile and portfolio in search results. This licence ends when the content is removed, except for copies we must keep for legal, safety, or dispute reasons.',
        'The AYOS name, logo, and website design belong to AYOS.',
      ],
    },
    {
      id: 'disputes',
      title: 'Problems with a job',
      summary: 'Talk to each other first. If that fails, open a dispute and our team will review it.',
      body: [
        'If something goes wrong, first try to settle it with the other person through AYOS messages.',
        'If that does not work, a customer can open a dispute on the job, with a description and up to four photos or PDF files as evidence. Our team will review both sides and may take steps such as changing the job status, hiding a review, or suspending an account.',
        'Our decision on a dispute is about how AYOS is used. It does not stop you from using other legal remedies, including going to the barangay or the courts.',
      ],
    },
    {
      id: 'suspension',
      title: 'Suspension and closing your account',
      summary: 'We may limit accounts that break these terms. You can delete your account at any time.',
      body: [
        'We may warn, limit, suspend, or close an account, or hide a listing, if we reasonably believe it broke these terms, put people at risk, or is required by law. Where it is safe to do so, we will tell you why.',
        'You can delete your account yourself in Sign-in & security, or ask us by emailing ' + email + ' from your account email. Open jobs and disputes must be finished first. Finished jobs and reviews stay without your name, so the other person keeps their records, as explained in our Privacy Policy.',
        'We may also pause AYOS for maintenance or updates.',
      ],
    },
    {
      id: 'liability',
      title: 'Our responsibility',
      summary: 'We work to keep AYOS safe and working, but we do not guarantee the work of providers.',
      body: [
        'AYOS is provided "as is". We try to keep it accurate, safe, and available, but we cannot promise it will always be error-free or online.',
        'We check providers before approval, but we do not supervise their work. We are not responsible for the quality, safety, legality, or timing of services, or for what users say or do, except where the law makes us responsible.',
        'To the extent allowed by Philippine law, AYOS is not liable for indirect or consequential losses, such as lost income. Nothing in these terms limits rights you have under the Consumer Act of the Philippines or other laws that cannot be waived.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes and governing law',
      summary: 'We will tell you before important changes. Philippine law applies.',
      body: [
        'We may update these terms as AYOS grows. If a change is important, we will notify you by email or in the app before it takes effect. If you keep using AYOS after that date, you accept the new terms.',
        'These terms are governed by the laws of the Republic of the Philippines. Your agreement to these terms is made electronically under the Electronic Commerce Act (Republic Act No. 8792).',
        'Questions? Email ' + email + '.',
      ],
    },
  ],
}

export const privacyPolicy: LegalDocument = {
  slug: 'privacy',
  path: '/privacy',
  title: 'Privacy Policy',
  navLabel: 'Privacy',
  intro: 'This policy explains what personal data AYOS collects, why we need it, who can see it, and how you can control it. It follows the Data Privacy Act of 2012 (Republic Act No. 10173).',
  sections: [
    {
      id: 'scope',
      title: 'Who we are',
      summary: 'AYOS is responsible for the personal data you give us on this website.',
      body: [
        'AYOS is the personal information controller for data collected through the AYOS website and app. This policy applies to customers, providers, and visitors.',
        'For any privacy question or request, contact our data protection contact at ' + email + '.',
      ],
    },
    {
      id: 'collect',
      title: 'What we collect',
      summary: 'Only what we need to run accounts, bookings, and safety checks.',
      body: [
        'Account data:',
        { list: [
          'Your name, email address, mobile number, and password (stored only as a secure hash).',
          'If you sign in with Google: your Google account ID, name, and email.',
          'Your display name and the date you accepted our terms.',
          'Saved addresses: region, province, city or municipality, barangay, street details, landmark, and postal code.',
        ] },
        'When you use the marketplace:',
        { list: [
          'Service requests: the service, description, notes, preferred time, and any photos you attach.',
          'Job records: status, schedule, completion, and cancellations.',
          'Messages and images you send in conversations, and reports you file.',
          'Reviews, ratings, disputes, and the evidence you upload.',
        ] },
        'If you apply as a provider:',
        { list: [
          'Business or display name, bio, profile photo, portfolio photos, service categories, and service areas.',
          'Verification documents you upload, such as an ID or permit.',
          'Activation payment references you submit.',
        ] },
        'Security and technical data:',
        { list: [
          'Your IP address, browser and device type, and sign-in sessions.',
          'Security events such as sign-ins, failed sign-ins, password changes, and two-step verification changes. We never record your password, recovery codes, or two-step secret in these logs.',
          'A reCAPTCHA check from Google on sign-up, sign-in, and password reset forms, to stop automated abuse.',
        ] },
      ],
    },
    {
      id: 'use',
      title: 'Why we use it',
      summary: 'To run your account and bookings, keep AYOS safe, and follow the law.',
      body: [
        { list: [
          'To create and secure your account, verify your email, and let you sign in. (Needed to provide the service you asked for.)',
          'To match requests with providers, share the details a provider needs for a job, and send you updates about requests, jobs, and messages. (Needed to provide the service.)',
          'To review provider applications, documents, and activation payments. (Needed to provide the service, and our legitimate interest in a trustworthy marketplace.)',
          'To prevent fraud, spam, and abuse, investigate reports and disputes, and keep security logs. (Our legitimate interest in keeping users safe.)',
          'To meet legal duties, such as responding to lawful requests from authorities. (Legal obligation.)',
        ] },
        'We do not sell your personal data. We do not use it for advertising, and we do not show ads on AYOS.',
      ],
    },
    {
      id: 'sharing',
      title: 'Who can see it',
      summary: 'Providers see only what they need, and only after they accept. Your street address is never public.',
      body: [
        { list: [
          'Everyone: an approved provider’s public profile, which includes display name, bio, photo, services, broad service area, portfolio, ratings, and reviews. Reviews show only the reviewer’s first name.',
          'The provider you send a request to: your name, the request details and photos, and a broad area. After they accept, they also see your service address.',
          'The customer who booked a provider: that provider’s profile and the messages in their conversation.',
          'Contact details in messages stay hidden until a booking is accepted.',
          'Authorized AYOS staff: only the data their role needs, for example to review applications, reports, disputes, or payments. Staff access is limited by role, and sensitive actions, such as opening a verification document, are recorded.',
        ] },
        'We use trusted service providers to run AYOS. They process data only on our instructions:',
        { list: [
          'Google, for Google sign-in, reCAPTCHA, and web fonts.',
          'Our hosting provider, for servers, the database, and file storage.',
          'Our email provider, for verification, password reset, and notification emails.',
        ] },
        'We may also disclose data when the law requires it, to protect someone’s safety, or as part of a merger or sale of AYOS, with notice to you.',
      ],
    },
    {
      id: 'security',
      title: 'How we protect it',
      summary: 'We encrypt sensitive fields, keep private files private, and limit staff access.',
      body: [
        { list: [
          'Street address details are encrypted in our database.',
          'Request photos and provider verification documents are kept in private storage. Only the people allowed to see them can open them.',
          'Passwords are hashed. Optional two-step verification is available.',
          'Sign-ins use secure session cookies. You can see your active sessions and sign out other devices. Changing your password signs out your other devices.',
          'Admin access requires a verified, active account and a role with the right permission.',
        ] },
        'No system is perfectly secure. If a data breach is likely to harm you, we will notify you and the National Privacy Commission as the law requires.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      summary: 'As long as your account is open, then only what we must keep.',
      body: [
        'We keep your data while your account is open, because you need it to use AYOS.',
        'When your account is closed, we delete or anonymize your personal data within a reasonable time. We may keep some records longer when we need them to settle disputes, prevent fraud, keep security logs, or meet legal, tax, or accounting duties. When that need ends, we delete them.',
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      summary: 'You can see, correct, download, or ask us to delete your data.',
      body: [
        'Under the Data Privacy Act, you have the right to:',
        { list: [
          'Be informed about how your data is used.',
          'Access a copy of your personal data.',
          'Correct data that is wrong or out of date. You can edit most of it yourself in your profile and saved addresses.',
          'Object to processing, and withdraw consent where we rely on it.',
          'Ask us to delete or block your data, when the law allows.',
          'Get your data in a common electronic format (data portability).',
          'Claim damages if you are harmed by misuse of your data.',
          'File a complaint with the National Privacy Commission (privacy.gov.ph).',
        ] },
        'You can download your data and delete your account yourself in Sign-in & security. For any other request, email ' + email + ' from your account email. We may ask you to confirm your identity. We aim to reply within 15 days.',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies',
      summary: 'We use only the cookies needed to sign you in and keep forms secure.',
      body: [
        'AYOS uses a session cookie to keep you signed in and a security cookie (XSRF-TOKEN) to protect forms. These are required for the site to work.',
        'Google reCAPTCHA may set its own cookies on forms that use it. We do not use advertising or analytics tracking cookies.',
      ],
    },
    {
      id: 'minors',
      title: 'Minors',
      summary: 'AYOS is for adults 18 and older.',
      body: [
        'AYOS accounts are only for people aged 18 and above. We do not knowingly collect data from minors. If you think a minor has created an account, tell us and we will remove it.',
      ],
    },
    {
      id: 'updates',
      title: 'Changes and contact',
      summary: 'We will tell you before important changes.',
      body: [
        'We may update this policy when AYOS changes. If a change is important, we will tell you by email or in the app before it applies. The date at the top shows the latest version.',
        'Questions or requests: ' + email + '.',
      ],
    },
  ],
}

export const legalDocuments = [termsOfService, privacyPolicy] as const
