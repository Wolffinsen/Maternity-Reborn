
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'auto';
    }

    const hero = document.querySelector('.storytelling-hero');
    const phrases = Array.from(document.querySelectorAll('.story-phrase'));

    if (hero && phrases.length) {
      const HERO_SEQUENCE_KEY = 'heroSequenceCompleted';
      const TRANSITION_MS = 700;

      const heroState = {
        active: false,
        currentStep: 0,
        totalSteps: phrases.length,
        isTransitioning: false,
        completed: sessionStorage.getItem(HERO_SEQUENCE_KEY) === 'true'
      };

      let touchStartY = null;
      let observer = null;
      let wheelLockedAt = 0;

      const logHeroState = (label = 'state') => {
        console.log(label, {
          active: heroState.active,
          currentStep: heroState.currentStep,
          totalSteps: heroState.totalSteps,
          isTransitioning: heroState.isTransitioning,
          completed: heroState.completed
        });
      };

      const setBodyLock = (locked) => {
        document.body.style.overflow = locked ? 'hidden' : '';
        document.documentElement.style.overflow = locked ? 'hidden' : '';
      };

      const renderCurrentStep = () => {
        phrases.forEach((phrase, index) => {
          const active = index === heroState.currentStep;
          phrase.classList.toggle('is-visible', active);
          phrase.classList.toggle('is-hidden', !active);
          phrase.style.opacity = active ? '1' : '0';
          phrase.style.transform = active ? 'translateY(0)' : 'translateY(18px)';
          phrase.style.filter = active ? 'blur(0)' : 'blur(4px)';
        });
      };

      const releaseTransitionGate = () => {
        heroState.isTransitioning = false;
        logHeroState('transition-end');
      };

      const attachHeroListeners = () => {
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
      };

      const removeHeroListeners = () => {
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      const completeSequence = () => {
        heroState.completed = true;
        heroState.active = false;
        heroState.isTransitioning = false;
        setBodyLock(false);
        sessionStorage.setItem(HERO_SEQUENCE_KEY, 'true');
        removeHeroListeners();
        logHeroState('sequence-complete');
      };

      const advanceHeroStep = (direction) => {
        if (heroState.isTransitioning) return;

        const nextStep = heroState.currentStep + direction;
        const boundedStep = Math.max(0, Math.min(nextStep, heroState.totalSteps - 1));

        if (direction > 0 && heroState.currentStep >= heroState.totalSteps - 1) {
          completeSequence();
          return;
        }

        heroState.isTransitioning = true;
        heroState.currentStep = boundedStep;
        renderCurrentStep();
        logHeroState('step-change');

        window.setTimeout(() => {
          releaseTransitionGate();
        }, TRANSITION_MS);
      };

      const onWheel = (event) => {
        if (!heroState.active || heroState.completed) return;

        if (Math.abs(event.deltaY) <= 10) return;

        if (heroState.isTransitioning) {
          event.preventDefault();
          return;
        }

        const now = Date.now();
        if (now - wheelLockedAt < 120) {
          event.preventDefault();
          return;
        }
        wheelLockedAt = now;

        const direction = event.deltaY > 0 ? 1 : -1;

        if (direction > 0 && heroState.currentStep >= heroState.totalSteps - 1) {
          completeSequence();
          return;
        }

        event.preventDefault();
        advanceHeroStep(direction);
      };

      const onTouchStart = (event) => {
        if (!heroState.active || heroState.completed) return;
        touchStartY = event.touches[0].clientY;
      };

      const onTouchMove = (event) => {
        if (!heroState.active || heroState.completed) return;
        event.preventDefault();
      };

      const onTouchEnd = (event) => {
        if (!heroState.active || heroState.completed || touchStartY === null) return;

        const touchEndY = event.changedTouches[0].clientY;
        const distance = touchEndY - touchStartY;
        touchStartY = null;

        if (Math.abs(distance) < 50 || heroState.isTransitioning) return;

        const direction = distance < 0 ? 1 : -1;

        if (direction > 0 && heroState.currentStep >= heroState.totalSteps - 1) {
          completeSequence();
          return;
        }

        event.preventDefault();
        advanceHeroStep(direction);
      };

      const activateHeroSequence = () => {
        if (heroState.completed) {
          heroState.active = false;
          removeHeroListeners();
          setBodyLock(false);
          logHeroState('already-completed');
          return;
        }

        if (!heroState.active) {
          heroState.active = true;
          heroState.currentStep = 0;
          renderCurrentStep();
          setBodyLock(true);
          attachHeroListeners();
          logHeroState('hero-activated');
        }
      };

      const deactivateHeroSequence = () => {
        heroState.active = false;
        heroState.isTransitioning = false;
        setBodyLock(false);
        removeHeroListeners();
        logHeroState('hero-deactivated');
      };

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (heroState.completed) {
            deactivateHeroSequence();
            return;
          }

          const isHeroVisible = entry.isIntersecting || entry.intersectionRatio > 0.8;

          if (isHeroVisible) {
            activateHeroSequence();
          } else if (heroState.active) {
            deactivateHeroSequence();
          }
        });
      }, {
        threshold: [0.8, 1]
      });

      observer.observe(hero);

      window.addEventListener('beforeunload', () => {
        removeHeroListeners();
        if (observer) observer.disconnect();
      });

      if (heroState.completed) {
        setBodyLock(false);
      } else {
        renderCurrentStep();
      }

      logHeroState('initial-state');
    }
  