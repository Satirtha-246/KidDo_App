import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kiddo_app/core/providers/user_provider.dart';
import 'package:kiddo_app/features/user/profilepage.dart';
import 'package:kiddo_app/features/lessons/lesson_details_page.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  late final PageController _subjectPageController;

  static const List<_SubjectInfo> _subjects = [
    _SubjectInfo(
      'Math',
      'Chapter 1 : Counting Number',
      Color(0xFF0284C7),
      Color(0xFFE0F2FE),
      Color(0xFF38BDF8),
      'assets/images/Math.png',
      0.45,
    ),
    _SubjectInfo(
      'GK',
      'Chapter 1 : Our Environment',
      Color(0xFF16A34A),
      Color(0xFFDCFCE7),
      Color(0xFF22C55E),
      'assets/images/GK.png',
      0.30,
    ),
    _SubjectInfo(
      'Science',
      'Chapter 1 : Basics of Science',
      Color(0xFFE11D48),
      Color(0xFFFFE4E6),
      Color(0xFFF43F5E),
      'assets/images/Science.png',
      0.20,
    ),
    _SubjectInfo(
      'English',
      'Chapter 1 : Alphabet',
      Color(0xFF9333EA),
      Color(0xFFF3E8FF),
      Color(0xFFA855F7),
      'assets/images/English.png',
      0.60,
    ),
    _SubjectInfo(
      'Computer',
      'Chapter 1 : Basics of Computer',
      Color(0xFFCA8A04),
      Color(0xFFFEF9C3),
      Color(0xFFEAB308),
      'assets/images/Computer.png',
      0.10,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _subjectPageController = PageController(viewportFraction: 0.88);
  }

  @override
  void dispose() {
    _subjectPageController.dispose();
    super.dispose();
  }

  void _openProfile() {
    Navigator.of(context, rootNavigator: true).push(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const Profilepage(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          const begin = Offset(-1.0, 0.0); // Slide in from LEFT
          const end = Offset.zero;
          const curve = Curves.easeInOutCubic;
          final tween =
              Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
          return SlideTransition(
            position: animation.drive(tween),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 350),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(userProvider);
    final user = userAsync.value;

    final streakCount = user?.streak ?? 5;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Top Bar (Matching Image 1) ───────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                child: Row(
                  children: [
                    // Profile Avatar
                    GestureDetector(
                      onTap: _openProfile,
                      child: Container(
                        height: 44,
                        width: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.12),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/profile_pic.jpg',
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const CircleAvatar(
                              backgroundColor: Color(0xFFE2E8F0),
                              child: Icon(Icons.person, color: Color(0xFF64748B)),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const Spacer(),

                    // Coins Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFFDE68A), width: 1.2),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/images/coin.png',
                            height: 18,
                            width: 18,
                            fit: BoxFit.contain,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${user?.coins ?? 0}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFD97706),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // IQ Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFBFDBFE), width: 1.2),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset(
                            'assets/images/IQ.png',
                            height: 18,
                            width: 18,
                            fit: BoxFit.contain,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${user?.iq ?? 0}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ── Daily Streak Banner ("5 Days!") ──────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: const Color(0xFFF97316),
                      width: 2.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF97316).withOpacity(0.15),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        height: 52,
                        width: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFEDD5),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        padding: const EdgeInsets.all(8),
                        child: Image.asset(
                          'assets/images/fire.png',
                          errorBuilder: (_, __, ___) =>
                              const Center(child: Text('🔥', style: TextStyle(fontSize: 26))),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$streakCount Days!',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            "You're on fire!",
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFEA580C),
                            ),
                          ),
                          const Text(
                            "Keep the streak going !",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ── Subject Cards (PageView Carousel) ────────────────────
              SizedBox(
                height: 380,
                child: PageView.builder(
                  controller: _subjectPageController,
                  itemCount: _subjects.length,
                  itemBuilder: (context, index) {
                    final subject = _subjects[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: _buildSubjectCard(context, subject),
                    );
                  },
                ),
              ),

              const SizedBox(height: 24),

              // ── Rewards For Active Section ────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Rewards For Active',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildRewardCard(
                          iconEmoji: '🎁',
                          bgColor: const Color(0xFFFFF7ED),
                          borderColor: const Color(0xFFFED7AA),
                          timerText: '23:59:54',
                        ),
                        const SizedBox(width: 14),
                        _buildRewardCard(
                          iconEmoji: '🃏',
                          bgColor: const Color(0xFFFEFCE8),
                          borderColor: const Color(0xFFFEF08A),
                          timerText: '23:59:54',
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ── Daily Challenges Section ─────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Daily Challenges',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildChallengeCard(
                      taskTitle: 'Task 1',
                      description: 'Start new chapter.',
                      fractionText: '2/3',
                      fractionValue: 2 / 3,
                      bgColor: const Color(0xFFE0F2FE),
                      accentColor: const Color(0xFF0284C7),
                      mascotEmoji: '🐘',
                    ),
                    const SizedBox(height: 10),
                    _buildChallengeCard(
                      taskTitle: 'Task 2',
                      description: "Complete today's Splash.",
                      fractionText: '1/2',
                      fractionValue: 1 / 2,
                      bgColor: const Color(0xFFDCFCE7),
                      accentColor: const Color(0xFF16A34A),
                      mascotEmoji: '🦹',
                    ),
                    const SizedBox(height: 10),
                    _buildChallengeCard(
                      taskTitle: 'Task 3',
                      description: 'Complete 3 quiz of Science.',
                      fractionText: '1/3',
                      fractionValue: 1 / 3,
                      bgColor: const Color(0xFFFEF9C3),
                      accentColor: const Color(0xFFCA8A04),
                      mascotEmoji: '👩‍🔬',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Subject Card Builder (Matching Image 1) ───────────────────────────
  Widget _buildSubjectCard(BuildContext context, _SubjectInfo subject) {
    return Container(
      decoration: BoxDecoration(
        color: subject.bgColor,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: subject.borderColor, width: 2.5),
        boxShadow: [
          BoxShadow(
            color: subject.primaryColor.withOpacity(0.12),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subject Illustration
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: double.infinity,
                color: Colors.white.withOpacity(0.6),
                child: Image.asset(
                  subject.assetImage,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Center(
                    child: Text(
                      subject.name == 'Math'
                          ? '📐'
                          : subject.name == 'GK'
                              ? '🌍'
                              : subject.name == 'Science'
                                  ? '🔬'
                                  : subject.name == 'English'
                                      ? '📖'
                                      : '💻',
                      style: const TextStyle(fontSize: 60),
                    ),
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Title
          Text(
            subject.name,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: subject.primaryColor,
              letterSpacing: 0.3,
            ),
          ),

          // Subtitle
          Text(
            subject.chapter,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),

          const SizedBox(height: 8),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: subject.progress,
              minHeight: 8,
              backgroundColor: Colors.white,
              valueColor: AlwaysStoppedAnimation<Color>(subject.primaryColor),
            ),
          ),

          const SizedBox(height: 14),

          // 3D Continue Button
          GestureDetector(
            onTap: () {
              Navigator.of(context, rootNavigator: true).push(
                MaterialPageRoute(
                  builder: (_) => LessonDetailsPage(
                    subjectName: subject.name,
                    gradientColors: [subject.primaryColor, subject.primaryColor.withOpacity(0.8)],
                    emoji: subject.name == 'Math'
                        ? '📐'
                        : subject.name == 'GK'
                            ? '🌍'
                            : subject.name == 'Science'
                                ? '🔬'
                                : subject.name == 'English'
                                    ? '📖'
                                    : '💻',
                  ),
                ),
              );
            },
            child: Stack(
              children: [
                // 3D Bevel bottom shadow
                Container(
                  height: 50,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Color.lerp(subject.primaryColor, Colors.black, 0.25),
                    borderRadius: BorderRadius.circular(22),
                  ),
                ),
                // Button face
                Container(
                  height: 45,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: subject.primaryColor,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Continue',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Reward Card Builder (Matching Image 1) ────────────────────────────
  Widget _buildRewardCard({
    required String iconEmoji,
    required Color bgColor,
    required Color borderColor,
    required String timerText,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: borderColor, width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(iconEmoji, style: const TextStyle(fontSize: 42)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderColor),
              ),
              child: Text(
                timerText,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Challenge Card Builder (Matching Image 1) ─────────────────────────
  Widget _buildChallengeCard({
    required String taskTitle,
    required String description,
    required String fractionText,
    required double fractionValue,
    required Color bgColor,
    required Color accentColor,
    required String mascotEmoji,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        children: [
          Container(
            height: 48,
            width: 48,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.7),
              borderRadius: BorderRadius.circular(16),
            ),
            alignment: Alignment.center,
            child: Text(mascotEmoji, style: const TextStyle(fontSize: 26)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      taskTitle,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: accentColor,
                      ),
                    ),
                    Text(
                      fractionText,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: accentColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF475569),
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: fractionValue,
                    minHeight: 6,
                    backgroundColor: Colors.white.withOpacity(0.6),
                    valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SubjectInfo {
  final String name;
  final String chapter;
  final Color primaryColor;
  final Color bgColor;
  final Color borderColor;
  final String assetImage;
  final double progress;

  const _SubjectInfo(
    this.name,
    this.chapter,
    this.primaryColor,
    this.bgColor,
    this.borderColor,
    this.assetImage,
    this.progress,
  );
}
