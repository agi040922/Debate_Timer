"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Home, Volume2, VolumeX, ZapOff, Zap, Info, X, AlertCircle, Minus, Plus, Check } from "lucide-react"
import { useRouter, useParams } from "next/navigation" // Import useParams
import Link from "next/link"
import { Users } from "lucide-react"
import { DebateStep, DebateStepType, DebateTeam } from "@/lib/types/debate"
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { toast } from "sonner"; // Import toast for notifications

// Define debater interface
interface Debater {
  id: string
  name: string
  team: "찬성" | "반대" | "긍정" | "부정"
  totalSpeakTime: number
  isSpeaking: boolean
}

export default function DebatePage() {
  const router = useRouter()
  const params = useParams(); // Get route parameters
  const debateId = params?.debateId as string; // Extract debateId

  const [steps, setSteps] = useState<DebateStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [debaters, setDebaters] = useState<Debater[]>([])
  const [templateName, setTemplateName] = useState("")
  const [currentSpeaker, setCurrentSpeaker] = useState<Debater | null>(null)
  const [speakerTimeRemaining, setSpeakerTimeRemaining] = useState(0)
  const [teamRemainingTime, setTeamRemainingTime] = useState<{
    찬성: number
    반대: number
    긍정: number
    부정: number
  }>({ 찬성: 0, 반대: 0, 긍정: 0, 부정: 0 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [enableDebaters, setEnableDebaters] = useState(true)
  const [activeSpeakingTeam, setActiveSpeakingTeam] = useState<"찬성" | "반대" | "긍정" | "부정" | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showTimeEndAlert, setShowTimeEndAlert] = useState<{show: boolean, message: string}>({show: false, message: ""})
  const [timeEditMode, setTimeEditMode] = useState(false)
  const [showDebateEndModal, setShowDebateEndModal] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 팀 타입 확인 함수
  const hasTeamType = (steps: DebateStep[], teamType: DebateTeam): boolean => {
    return steps.some(step => step.team === teamType);
  }

  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);


  // Define LiveState interface (consistent with what's stored in Supabase)
  interface LiveState {
    currentStepIndex: number;
    remainingTime: number;
    isRunning: boolean;
    debaters: Debater[];
    currentSpeakerId: string | null;
    speakerTimeRemaining: number;
    teamRemainingTime: { [key: string]: number }; // Ensure keys like "찬성", "긍정" etc. are covered
    activeSpeakingTeam: "찬성" | "반대" | "긍정" | "부정" | null; // More specific type
    showDebateEndModal: boolean;
  }
  
  // Helper function to get team names (can be defined outside or passed if needed)
  const getTeamNamesFromSteps = (stepsToAnalyze: DebateStep[]): { positiveTeam: "긍정" | "찬성", negativeTeam: "부정" | "반대" } => {
    const hasPositiveTeamStep = stepsToAnalyze.some(step => step.team === "긍정");
    const hasNegativeTeamStep = stepsToAnalyze.some(step => step.team === "부정");
    return {
      positiveTeam: hasPositiveTeamStep ? "긍정" : "찬성",
      negativeTeam: hasNegativeTeamStep ? "부정" : "반대",
    };
  };

  // Function to update live state in Supabase
  const updateLiveStateInSupabase = async (newStatePart: Partial<LiveState>) => {
    if (!debateId || !isInitialLoadComplete || !isSubscribed) {
      console.log("Update skipped: Not ready or not subscribed", { debateId, isInitialLoadComplete, isSubscribed });
      return; 
    }

    // Create the full state object for update.
    // This ensures we're always sending the complete live_state structure.
    const currentLiveStateForUpdate: LiveState = {
      currentStepIndex,
      remainingTime,
      isRunning,
      debaters,
      currentSpeakerId: currentSpeaker ? currentSpeaker.id : null,
      speakerTimeRemaining,
      teamRemainingTime,
      activeSpeakingTeam,
      showDebateEndModal,
    };
    
    const finalStateToUpdate = { ...currentLiveStateForUpdate, ...newStatePart };

    try {
      // console.log("Attempting to update live_state in Supabase with:", finalStateToUpdate);
      const { error } = await supabase
        .from('active_debates')
        .update({ live_state: finalStateToUpdate })
        .eq('id', debateId);
      if (error) {
        console.error("Error updating live state in Supabase:", error);
        toast.error("Failed to sync debate state. Please check your connection or try again.", {
          description: error.message,
        });
        throw error; // Re-throw if other parts of the app need to react
      }
      // console.log("Successfully updated live_state in Supabase for debate:", debateId);
    } catch (error) {
      // Error already logged and toasted if it's a Supabase error.
      // If it's a different error source, log it here.
      if (!(error.message && error.message.includes("Failed to sync debate state"))) {
         console.error("An unexpected error occurred in updateLiveStateInSupabase:", error);
      }
      // No need to re-toast if already handled, unless providing a more generic message.
    }
  };

  // Load initial_config and live_state from Supabase
  useEffect(() => {
    if (!debateId) return;

    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('active_debates')
          .select('initial_config, template_name, live_state')
          .eq('id', debateId)
          .single();

        if (error) throw error;

        if (data) {
          const config = data.initial_config;
          const fetchedLiveState = data.live_state as LiveState | null;

          setSteps(config.steps); // This comes from initial_config, assumed static
          setTemplateName(data.template_name); // Also from initial_config
          setEnableDebaters(config.enableDebaters); // From initial_config

          if (fetchedLiveState) {
            console.log("Initializing state from fetched live_state:", fetchedLiveState);
            setCurrentStepIndex(fetchedLiveState.currentStepIndex);
            setRemainingTime(fetchedLiveState.remainingTime);
            setIsRunning(fetchedLiveState.isRunning);
            setDebaters(fetchedLiveState.debaters);
            if (fetchedLiveState.currentSpeakerId) {
              const speaker = fetchedLiveState.debaters.find(d => d.id === fetchedLiveState.currentSpeakerId);
              setCurrentSpeaker(speaker || null);
            } else {
              setCurrentSpeaker(null);
            }
            setSpeakerTimeRemaining(fetchedLiveState.speakerTimeRemaining);
            setTeamRemainingTime(fetchedLiveState.teamRemainingTime);
            setActiveSpeakingTeam(fetchedLiveState.activeSpeakingTeam);
            setShowDebateEndModal(fetchedLiveState.showDebateEndModal);
          } else {
            // This block is a fallback if live_state was not initialized by app/page.tsx
            // It should ideally not be hit if step 2 of the plan was successful.
            console.log("live_state is null, initializing from initial_config");
            if (config.steps.length > 0) {
              setRemainingTime(config.steps[0].time);
            }
            const newDebaters: Debater[] = [];
            const { positiveTeam, negativeTeam } = getTeamNamesFromSteps(config.steps);
            if (config.enableDebaters) {
              for (let i = 0; i < config.affirmativeCount; i++) {
                newDebaters.push({
                  id: `aff-${i}`, name: config.debaterNames?.[i] || `${positiveTeam}${i + 1}`,
                  team: positiveTeam, totalSpeakTime: 0, isSpeaking: false,
                });
              }
              for (let i = 0; i < config.negativeCount; i++) {
                newDebaters.push({
                  id: `neg-${i}`, name: config.debaterNames?.[config.affirmativeCount + i] || `${negativeTeam}${i + 1}`,
                  team: negativeTeam, totalSpeakTime: 0, isSpeaking: false,
                });
              }
            } else {
              newDebaters.push({ id: `aff-team`, name: `${positiveTeam}팀`, team: positiveTeam, totalSpeakTime: 0, isSpeaking: false });
              newDebaters.push({ id: `neg-team`, name: `${negativeTeam}팀`, team: negativeTeam, totalSpeakTime: 0, isSpeaking: false });
            }
            setDebaters(newDebaters);

            const freeDebateStep = config.steps.find((step: DebateStep) => step.type === "자유토론");
            const initialTeamTimes = { 찬성: 0, 반대: 0, 긍정: 0, 부정: 0 };
            if (freeDebateStep) {
                initialTeamTimes[positiveTeam] = freeDebateStep.time / 2;
                initialTeamTimes[negativeTeam] = freeDebateStep.time / 2;
            }
            setTeamRemainingTime(initialTeamTimes);
            // After setting up from initial_config, immediately push this as the first live_state
            const initialLiveStateFromConfig: LiveState = {
              currentStepIndex: 0,
              remainingTime: config.steps.length > 0 ? config.steps[0].time : 0,
              isRunning: false,
              debaters: newDebaters,
              currentSpeakerId: null,
              speakerTimeRemaining: 0,
              teamRemainingTime: initialTeamTimes,
              activeSpeakingTeam: null,
              showDebateEndModal: false,
            };
            // updateLiveStateInSupabase(initialLiveStateFromConfig); // This might cause issues if subscription is not ready. Better to let user interaction trigger first update.
          }
          setIsInitialLoadComplete(true);
        } else {
          console.error("Debate not found for ID:", debateId);
          alert("Debate session not found. Redirecting to home.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching debate data:", error);
        alert("Error loading debate. Redirecting to home.");
        router.push("/");
      }
    };

    fetchInitialData();
    audioRef.current = new Audio("/beep.mp3");
  }, [debateId, router]);

  // Supabase real-time subscription
  useEffect(() => {
    if (!debateId || !isInitialLoadComplete) return;

    const channel = supabase
      .channel(`debate-${debateId}-live-state`)
      .on<LiveState>(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'active_debates', 
          filter: `id=eq.${debateId}` 
        },
        (payload) => {
          // console.log('Received Supabase payload:', payload);
          const newLiveState = payload.new as { live_state: LiveState };
          if (newLiveState && newLiveState.live_state) {
            const incoming = newLiveState.live_state;
            // console.log('Incoming live_state:', incoming);

            if (incoming.currentStepIndex !== currentStepIndexRef.current) setCurrentStepIndex(incoming.currentStepIndex);
            if (incoming.remainingTime !== remainingTimeRef.current) setRemainingTime(incoming.remainingTime);
            if (incoming.isRunning !== isRunningRef.current) setIsRunning(incoming.isRunning);
            if (JSON.stringify(incoming.debaters) !== JSON.stringify(debatersRef.current)) setDebaters(incoming.debaters);
            
            const newCurrentSpeaker = incoming.currentSpeakerId 
              ? incoming.debaters.find(d => d.id === incoming.currentSpeakerId) || null
              : null;
            if ((currentSpeakerRef.current?.id || null) !== (newCurrentSpeaker?.id || null)) setCurrentSpeaker(newCurrentSpeaker);

            if (incoming.speakerTimeRemaining !== speakerTimeRemainingRef.current) setSpeakerTimeRemaining(incoming.speakerTimeRemaining);
            if (JSON.stringify(incoming.teamRemainingTime) !== JSON.stringify(teamRemainingTimeRef.current)) setTeamRemainingTime(incoming.teamRemainingTime);
            if (incoming.activeSpeakingTeam !== activeSpeakingTeamRef.current) setActiveSpeakingTeam(incoming.activeSpeakingTeam);
            if (incoming.showDebateEndModal !== showDebateEndModalRef.current) setShowDebateEndModal(incoming.showDebateEndModal);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to live updates for debate:', debateId);
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
          if (err) console.error('Subscription error:', err);
        }
      });

    return () => {
      console.log("Removing channel subscription for debate:", debateId);
      supabase.removeChannel(channel).then(() => setIsSubscribed(false));
    };
  }, [debateId, isInitialLoadComplete]);
  
  // Refs for state values to use in subscription callback to avoid stale closures
  const currentStepIndexRef = useRef(currentStepIndex);
  const remainingTimeRef = useRef(remainingTime);
  const isRunningRef = useRef(isRunning);
  const debatersRef = useRef(debaters);
  const currentSpeakerRef = useRef(currentSpeaker);
  const speakerTimeRemainingRef = useRef(speakerTimeRemaining);
  const teamRemainingTimeRef = useRef(teamRemainingTime);
  const activeSpeakingTeamRef = useRef(activeSpeakingTeam);
  const showDebateEndModalRef = useRef(showDebateEndModal);

  useEffect(() => { currentStepIndexRef.current = currentStepIndex; }, [currentStepIndex]);
  useEffect(() => { remainingTimeRef.current = remainingTime; }, [remainingTime]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { debatersRef.current = debaters; }, [debaters]);
  useEffect(() => { currentSpeakerRef.current = currentSpeaker; }, [currentSpeaker]);
  useEffect(() => { speakerTimeRemainingRef.current = speakerTimeRemaining; }, [speakerTimeRemaining]);
  useEffect(() => { teamRemainingTimeRef.current = teamRemainingTime; }, [teamRemainingTime]);
  useEffect(() => { activeSpeakingTeamRef.current = activeSpeakingTeam; }, [activeSpeakingTeam]);
  useEffect(() => { showDebateEndModalRef.current = showDebateEndModal; }, [showDebateEndModal]);


  // Timer effect
  useEffect(() => {
    if (isRunningRef.current && isInitialLoadComplete) { // Use ref for isRunning check
      timerRef.current = setInterval(() => {
        const currentStepForTimer = steps[currentStepIndexRef.current];
        const isFreeDebate = currentStepForTimer?.type === "자유토론";
        const noSpeakerSelected = isFreeDebate && !activeSpeakingTeamRef.current && !currentSpeakerRef.current;
        
        if (isFreeDebate && noSpeakerSelected) {
          return; // Timer doesn't run if free debate and no speaker selected
        }

        let newRemainingTimeLocal = 0;
        setRemainingTime(prev => {
          newRemainingTimeLocal = prev - 1;
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            if (soundEnabled) audioRef.current?.play();
            setShowTimeEndAlert({
              show: true, 
              message: currentStepForTimer?.team 
                ? `${currentStepForTimer.type} (${currentStepForTimer.team}) 시간이 종료되었습니다.`
                : `${currentStepForTimer?.type || '현재 단계'} 시간이 종료되었습니다.`
            });
            setTimeout(() => setShowTimeEndAlert({show: false, message: ""}), 5000);
            
            // Persist that timer for the step has ended
            updateLiveStateInSupabase({ isRunning: false, remainingTime: 0 });
            setIsRunning(false); // Also update local isRunning state
            return 0;
          }
          return prev - 1;
        });
        
        const currentSpeakerForTimer = currentSpeakerRef.current;
        const activeSpeakingTeamForTimer = activeSpeakingTeamRef.current;

        if (isFreeDebate && activeSpeakingTeamForTimer) {
          setTeamRemainingTime(prevTeamTimes => {
            const teamTime = prevTeamTimes[activeSpeakingTeamForTimer] || 0;
            const newTeamTime = Math.max(0, teamTime - 1);
            if (newTeamTime === 0 && teamTime > 0) {
              if (soundEnabled) audioRef.current?.play();
              setShowTimeEndAlert({show: true, message: `${activeSpeakingTeamForTimer}팀의 시간이 모두 종료되었습니다.`});
              setTimeout(() => setShowTimeEndAlert({show: false, message: ""}), 5000);
              // Persist team time ending - potentially as part of a larger update if speaker also stops
            }
            return { ...prevTeamTimes, [activeSpeakingTeamForTimer]: newTeamTime };
          });
        }

        if (currentSpeakerForTimer) {
          let finalSpeakerTime = 0;
          setSpeakerTimeRemaining(prevSpeakerTime => {
            finalSpeakerTime = prevSpeakerTime -1;
            if (prevSpeakerTime <= 1) {
              if (soundEnabled) audioRef.current?.play();
              setShowTimeEndAlert({show: true, message: `${currentSpeakerForTimer.name}의 발언 시간이 종료되었습니다.`});
              setTimeout(() => setShowTimeEndAlert({show: false, message: ""}), 5000);
              
              const updatedDebaters = debatersRef.current.map(d => 
                d.id === currentSpeakerForTimer.id ? {...d, totalSpeakTime: d.totalSpeakTime + 1, isSpeaking: false } : d
              );
              setDebaters(updatedDebaters); // Update local debaters

              if (isFreeDebate) {
                 // Persist speaker stopping and debater update
                updateLiveStateInSupabase({ 
                  speakerTimeRemaining: 0, 
                  currentSpeakerId: null, 
                  activeSpeakingTeam: null,
                  debaters: updatedDebaters,
                });
                setCurrentSpeaker(null); // Update local state
                setActiveSpeakingTeam(null); // Update local state
              } else {
                 // For non-free debate, just update time and debaters
                 updateLiveStateInSupabase({speakerTimeRemaining: 0, debaters: updatedDebaters});
              }
              return 0;
            }
            return prevSpeakerTime - 1;
          });

          setDebaters(prevDebaters => 
            prevDebaters.map(d => 
              d.id === currentSpeakerForTimer.id ? { ...d, totalSpeakTime: d.totalSpeakTime + 1 } : d
            )
          );
        }
        
        // Periodic sync of running timer values
        if (newRemainingTimeLocal > 0 && newRemainingTimeLocal % 5 === 0) {
             updateLiveStateInSupabase({
                 remainingTime: newRemainingTimeLocal,
                 ...(currentSpeakerForTimer && { speakerTimeRemaining: finalSpeakerTime }), // finalSpeakerTime is from the closure, might be an issue.
                 // It's better to read from speakerTimeRemainingRef.current if needing the most recent.
                 // However, for periodic sync, this might be acceptable.
                 ...(activeSpeakingTeamForTimer && { teamRemainingTime: teamRemainingTimeRef.current }),
                 debaters: debatersRef.current // Sync debaters too for totalSpeakTime
             });
         }

      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, steps, soundEnabled, isInitialLoadComplete]); // isRunning is the primary trigger

  const handleSetIsRunning = (running: boolean) => {
    if (!isInitialLoadComplete || !isSubscribed) return; // Ensure subscription before allowing updates
    setIsRunning(running); 
    // Also sync current debaters state (especially totalSpeakTime) when pausing/playing
    updateLiveStateInSupabase({ 
      isRunning: running, 
      remainingTime: remainingTimeRef.current, 
      debaters: debatersRef.current 
    });
  }

  // Handle step change
  const handleStepChange = (index: number) => {
    if (!isInitialLoadComplete || !isSubscribed) return;
    
    let newIsRunning = false;
    let newShowDebateEndModal = showDebateEndModalRef.current; // Default to current

    if (index >= steps.length) { // End of debate
      newIsRunning = false;
      newShowDebateEndModal = true;
      setIsRunning(newIsRunning); 
      setShowDebateEndModal(newShowDebateEndModal); 
      updateLiveStateInSupabase({ 
        isRunning: newIsRunning, 
        showDebateEndModal: newShowDebateEndModal, 
        currentStepIndex: currentStepIndexRef.current, // Persist current index at end
        remainingTime: 0 // No remaining time at end
      });
      return;
    }

    if (index < 0) return; // Should be disabled by UI

    newIsRunning = false; // Stop timer on any manual step change
    const newRemainingTime = steps[index].time;
    
    // Local state updates first
    setIsRunning(newIsRunning);
    setCurrentSpeaker(null); // Reset speaker
    setActiveSpeakingTeam(null); // Reset team
    setCurrentStepIndex(index);
    setRemainingTime(newRemainingTime);
    setSpeakerTimeRemaining(0); // Reset speaker time
    // showDebateEndModal remains as is unless it's the end of debate (handled above)
    
    updateLiveStateInSupabase({ 
      isRunning: newIsRunning, 
      currentSpeakerId: null, 
      activeSpeakingTeam: null, 
      currentStepIndex: index, 
      remainingTime: newRemainingTime, 
      speakerTimeRemaining: 0,
      showDebateEndModal: newShowDebateEndModal // Persist its current state
    });
  }

  // 팀 발언 토글
  const handleTeamSpeaking = (team: "찬성" | "반대" | "긍정" | "부정") => {
    if (!isInitialLoadComplete || !isSubscribed || (enableDebaters && debatersRef.current.length > 2)) return;

    let newActiveSpeakingTeam = activeSpeakingTeamRef.current;
    let newCurrentSpeakerId = currentSpeakerRef.current?.id || null;
    let newSpeakerTimeRemaining = speakerTimeRemainingRef.current;
    let currentDebaterForTeam = debatersRef.current.find(d => d.team === team);


    if (activeSpeakingTeamRef.current === team) { // Clicking the same active team
      newActiveSpeakingTeam = null; // Stop speaking
      newCurrentSpeakerId = null; // No specific speaker
      // Speaker time remaining might be preserved or reset based on rules, here resetting for simplicity.
      newSpeakerTimeRemaining = 0; 
    } else { // Clicking a new team or no team was active
      const teamTime = teamRemainingTimeRef.current[team] || 0;
      if (teamTime <= 0) {
        if (soundEnabled) audioRef.current?.play();
        return; // No time left for this team
      }
      newActiveSpeakingTeam = team;
      if (currentDebaterForTeam) { // If a debater object exists for the team (dummy or real)
          newCurrentSpeakerId = currentDebaterForTeam.id;
          // If switching to a new team or no speaker was active for the current team, or speaker time was 0
          if (currentSpeakerRef.current?.team !== team || speakerTimeRemainingRef.current === 0) {
            const maxTime = steps[currentStepIndexRef.current]?.maxSpeakTime || currentStepForTimer.time; // Fallback to step time if maxSpeakTime undefined
            newSpeakerTimeRemaining = Math.min(maxTime, teamTime);
          }
      } else { // Should not happen if debaters are initialized correctly
          newCurrentSpeakerId = null;
          newSpeakerTimeRemaining = 0;
      }
    }
    
    setActiveSpeakingTeam(newActiveSpeakingTeam);
    setCurrentSpeaker(debatersRef.current.find(d => d.id === newCurrentSpeakerId) || null);
    setSpeakerTimeRemaining(newSpeakerTimeRemaining);
    
    updateLiveStateInSupabase({ 
      activeSpeakingTeam: newActiveSpeakingTeam, 
      currentSpeakerId: newCurrentSpeakerId,
      speakerTimeRemaining: newSpeakerTimeRemaining,
      debaters: debatersRef.current // Persist current debater states (isSpeaking might change)
    });
  }

  // Handle speaker selection
  const handleSpeakerSelect = (debater: Debater) => {
    if (!isInitialLoadComplete || !isSubscribed || steps[currentStepIndexRef.current]?.type !== "자유토론") return;

    let newCurrentSpeakerId = currentSpeakerRef.current?.id || null;
    let newActiveSpeakingTeam = activeSpeakingTeamRef.current;
    let newSpeakerTimeRemaining = speakerTimeRemainingRef.current;
    let newDebaters = [...debatersRef.current]; // Create a new array for modification

    if (currentSpeakerRef.current?.id === debater.id) { // Clicking the current speaker
      newCurrentSpeakerId = null; // Stop this speaker
      newActiveSpeakingTeam = null; // No team is actively speaking via a selected debater
      newSpeakerTimeRemaining = 0; // Reset speaker time
      newDebaters = newDebaters.map(d => ({ ...d, isSpeaking: false })); // Mark all as not speaking
    } else { // Clicking a new speaker
      const teamTime = teamRemainingTimeRef.current[debater.team] || 0;
      if (teamTime <= 0 && steps[currentStepIndexRef.current]?.type === "자유토론") { // Check team time only for free debate
        if (soundEnabled) audioRef.current?.play();
        return; // Team has no time left
      }
      newCurrentSpeakerId = debater.id;
      newActiveSpeakingTeam = debater.team; // This speaker's team becomes active
      // If switching to a new speaker (even within the same team) or if current speaker time was 0,
      // reset their allowed speaking time based on rules.
      const maxTime = steps[currentStepIndexRef.current].maxSpeakTime || currentStepForTimer.time;
      newSpeakerTimeRemaining = Math.min(maxTime, teamTime); // Speaker can speak up to maxSpeakTime or remaining team time
      
      newDebaters = newDebaters.map((d) => ({ ...d, isSpeaking: d.id === debater.id }));
    }
    
    setCurrentSpeaker(newDebaters.find(d => d.id === newCurrentSpeakerId) || null);
    setActiveSpeakingTeam(newActiveSpeakingTeam);
    setSpeakerTimeRemaining(newSpeakerTimeRemaining);
    setDebaters(newDebaters);

    updateLiveStateInSupabase({ 
      currentSpeakerId: newCurrentSpeakerId,
      activeSpeakingTeam: newActiveSpeakingTeam,
      speakerTimeRemaining: newSpeakerTimeRemaining,
      debaters: newDebaters // This now includes the updated isSpeaking status
    });
  }

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get current step
  const currentStep = steps[currentStepIndex]

  // Calculate progress percentage
  const calculateProgress = (current: number, total: number): number => {
    return Math.max(0, Math.min(100, (current / total) * 100))
  }

  // 팀 색상 반환 함수 추가
  const getTeamColor = (team: "찬성" | "반대" | "긍정" | "부정" | null) => {
    if (team === "찬성" || team === "긍정") {
      return "text-blue-500";
    } else if (team === "반대" || team === "부정") {
      return "text-orange-500";
    }
    return "";
  };

  // 팀 배경색 반환 함수
  const getTeamBgColor = (team: "찬성" | "반대" | "긍정" | "부정" | null) => {
    if (team === "찬성" || team === "긍정") {
      return "bg-blue-100";
    } else if (team === "반대" || team === "부정") {
      return "bg-orange-100";
    }
    return "";
  };

  // 긍정/찬성 팀 여부 확인
  const isPositiveTeam = (steps: DebateStep[]) => {
    return hasTeamType(steps, "긍정");
  };

  // 부정/반대 팀 여부 확인
  const isNegativeTeam = (steps: DebateStep[]) => {
    return hasTeamType(steps, "부정");
  };

  return (
    <div className="container mx-auto py-4 px-4 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Link href="/" className="flex items-center text-gray-600">
          <Home className="h-5 w-5 mr-1" />
          <span className="text-sm">홈</span>
        </Link>
        <h1 className="text-xl font-bold">{templateName}</h1>
        <Button variant="ghost" size="sm" className="text-gray-600" onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </div>

      {/* Debate flow */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {steps.map((step, index) => (
            <Button
              key={step.id}
              variant={index === currentStepIndex ? "default" : "outline"}
              className={`text-xs px-2 py-1 h-auto whitespace-nowrap ${index === currentStepIndex ? "bg-primary" : ""}`}
              onClick={() => handleStepChange(index)}
            >
              {index + 1}. {step.type}
              {step.team && ` (${step.team})`}
            </Button>
          ))}
        </div>
      </div>

      {/* 시간 종료 알림 */}
      {showTimeEndAlert.show && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-md p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">{showTimeEndAlert.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 -mt-1 -mr-1"
            onClick={() => setShowTimeEndAlert({show: false, message: ""})}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main timer */}
      <Card className="flex-1 flex flex-col items-center justify-center p-6 mb-6">
        <div className="text-sm font-medium mb-2">
          {currentStep?.type}
          {currentStep?.team && ` - ${currentStep.team}`}
        </div>

        {currentStep?.type !== "자유토론" && (
          <>
            <div className="text-6xl font-bold mb-4">{formatTime(remainingTime)}</div>
            <Progress value={calculateProgress(remainingTime, currentStep?.time || 1)} className="w-full h-2 mb-6" />
          </>
        )}

        {/* Free debate info */}
        {currentStep?.type === "자유토론" && (
          <div className="w-full">
            {/* 자유토론 가이드 버튼과 오류수정 버튼 */}
            <div className="flex justify-between mb-2">
              <Button 
                variant="outline" 
                size="sm"
                className={`text-xs h-7 ${timeEditMode ? 'bg-red-50 text-red-600 border-red-300' : ''}`}
                onClick={() => setTimeEditMode(!timeEditMode)}
              >
                {timeEditMode ? "수정 완료" : "시간 오류 수정"}
              </Button>
              
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 text-gray-500 rounded-full"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <Info className="h-4 w-4" />
                </Button>
                
                {/* 가이드 메시지 */}
                {showGuide && (
                  <div className="absolute right-0 top-8 z-50 bg-white shadow-lg rounded-md border p-3 w-64">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-medium">자유토론 사용 가이드</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 text-gray-400"
                        onClick={() => setShowGuide(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600">
                      {enableDebaters && debaters.length > 2 ? (
                        <p>
                          1. 발언할 토론자 버튼을 선택하세요.<br />
                          2. 재생 버튼을 눌러 타이머를 시작하세요.<br />
                          3. 다른 토론자 버튼을 클릭하여 변경 가능합니다.<br />
                          4. 각 토론자의 발언 시간이 자동 기록됩니다.
                        </p>
                      ) : (
                        <p>
                          1. 발언할 팀(찬성/반대)을 선택하세요.<br />
                          2. 재생 버튼을 눌러 타이머를 시작하세요.<br />
                          3. 다른 팀을 클릭하여 변경할 수 있습니다.<br />
                          4. 현재 선택된 팀을 다시 클릭하면 발언 중지됩니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 현재 팀 발언 상태 표시 */}
            {activeSpeakingTeam && (
              <div className="text-center mb-6">
                <div className="text-sm font-medium">현재 발언</div>
                <div className={`text-2xl font-bold ${getTeamColor(activeSpeakingTeam)}`}>
                  {activeSpeakingTeam}팀 {formatTime(speakerTimeRemaining)}
                </div>
                {/* 팀 남은 시간과 최대 발언 시간 중 작은 값을 사용하여 진행률 계산 */}
                <Progress
                  value={calculateProgress(
                    speakerTimeRemaining,
                    Math.min(
                      teamRemainingTime[activeSpeakingTeam] || 0,
                      currentStep?.maxSpeakTime || 1
                    )
                  )}
                  className={`w-full h-1 mt-1 ${getTeamBgColor(activeSpeakingTeam)}`}
                />
                {/* 팀 시간이 최대 발언 시간보다 적을 경우 알림 표시 */}
                {(teamRemainingTime[activeSpeakingTeam] || 0) < (currentStep?.maxSpeakTime || 0) && (
                  <div className="text-xs text-gray-500 mt-1">
                    팀 시간 제한으로 {formatTime(teamRemainingTime[activeSpeakingTeam] || 0)} 남음
                  </div>
                )}
              </div>
            )}

            {/* 팀별 남은 시간 - 더 크게 표시 */}
            <div className="grid grid-cols-2 gap-8 w-full mb-6">
              <div 
                className={`text-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  activeSpeakingTeam === "찬성" || activeSpeakingTeam === "긍정"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => {
                  if (!timeEditMode) {
                    // 현재 설정된 팀 타입 확인 (긍정/찬성)
                    const positiveTeam = isPositiveTeam(steps) ? "긍정" : "찬성";
                    handleTeamSpeaking(positiveTeam);
                  }
                }}
              >
                <div className="font-medium mb-1">
                  {isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}
                </div>
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  {isPositiveTeam(steps) 
                    ? formatTime(teamRemainingTime.긍정 || 0) 
                    : formatTime(teamRemainingTime.찬성 || 0)}
                </div>
                <Progress 
                  value={calculateProgress(
                    isPositiveTeam(steps)
                      ? (teamRemainingTime.긍정 || 0) 
                      : (teamRemainingTime.찬성 || 0), 
                    currentStep?.time ? currentStep.time / 2 : 1
                  )} 
                  className="w-full h-3" 
                />
                
                {/* 오류수정 모드일 때만 표시되는 시간 조정 버튼 */}
                {timeEditMode && (
                  <div className="flex justify-center items-center gap-4 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setTeamRemainingTime(prev => {
                          const team = isPositiveTeam(steps) ? "긍정" : "찬성";
                          const currentTime = prev[team] || 0;
                          return {
                            ...prev,
                            [team]: Math.max(0, currentTime - 10)
                          };
                        });
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setTeamRemainingTime(prev => {
                          const team = isPositiveTeam(steps) ? "긍정" : "찬성";
                          const currentTime = prev[team] || 0;
                          const maxTime = currentStep?.time ? currentStep.time / 2 : 0;
                          return {
                            ...prev,
                            [team]: Math.min(maxTime, currentTime + 10)
                          };
                        });
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div 
                className={`text-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  activeSpeakingTeam === "반대" || activeSpeakingTeam === "부정"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-300"
                }`}
                onClick={() => {
                  if (!timeEditMode) {
                    // 현재 설정된 팀 타입 확인 (부정/반대)
                    const negativeTeam = isNegativeTeam(steps) ? "부정" : "반대";
                    handleTeamSpeaking(negativeTeam);
                  }
                }}
              >
                <div className="font-medium mb-1">
                  {isNegativeTeam(steps) ? "부정팀" : "반대팀"}
                </div>
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  {isNegativeTeam(steps) 
                    ? formatTime(teamRemainingTime.부정 || 0) 
                    : formatTime(teamRemainingTime.반대 || 0)}
                </div>
                <Progress 
                  value={calculateProgress(
                    isNegativeTeam(steps)
                      ? (teamRemainingTime.부정 || 0) 
                      : (teamRemainingTime.반대 || 0), 
                    currentStep?.time ? currentStep.time / 2 : 1
                  )} 
                  className="w-full h-3" 
                />
                
                {/* 오류수정 모드일 때만 표시되는 시간 조정 버튼 */}
                {timeEditMode && (
                  <div className="flex justify-center items-center gap-4 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setTeamRemainingTime(prev => {
                          const team = isNegativeTeam(steps) ? "부정" : "반대";
                          const currentTime = prev[team] || 0;
                          return {
                            ...prev,
                            [team]: Math.max(0, currentTime - 10)
                          };
                        });
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setTeamRemainingTime(prev => {
                          const team = isNegativeTeam(steps) ? "부정" : "반대";
                          const currentTime = prev[team] || 0;
                          const maxTime = currentStep?.time ? currentStep.time / 2 : 0;
                          return {
                            ...prev,
                            [team]: Math.min(maxTime, currentTime + 10)
                          };
                        });
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* 토론자 활성화 시 토론자 목록을 별도 섹션으로 분리 */}
            {enableDebaters && debaters.length > 2 && (
              <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                <h3 className="text-xs font-medium mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-1 text-gray-500" />
                  <span>발언자 기록</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-blue-700 mb-1">
                      {isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {debaters.filter(d => d.team === "찬성" || d.team === "긍정").map((debater) => (
                        <button
                          key={debater.id}
                          className={`flex items-center justify-between w-full p-2 rounded-md text-xs ${
                            debater.isSpeaking
                              ? "bg-blue-500 text-white font-medium"
                              : "bg-white border border-blue-100 text-blue-700 hover:bg-blue-50"
                          } ${teamRemainingTime[debater.team] <= 0 ? "opacity-50" : ""}`}
                          onClick={() => handleSpeakerSelect(debater)}
                        >
                          <span>{debater.name}</span>
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                            {formatTime(debater.totalSpeakTime)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-orange-700 mb-1">
                      {isNegativeTeam(steps) ? "부정팀" : "반대팀"}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {debaters.filter(d => d.team === "반대" || d.team === "부정").map((debater) => (
                        <button
                          key={debater.id}
                          className={`flex items-center justify-between w-full p-2 rounded-md text-xs ${
                            debater.isSpeaking
                              ? "bg-orange-500 text-white font-medium"
                              : "bg-white border border-orange-100 text-orange-700 hover:bg-orange-50"
                          } ${teamRemainingTime[debater.team] <= 0 ? "opacity-50" : ""}`}
                          onClick={() => handleSpeakerSelect(debater)}
                        >
                          <span>{debater.name}</span>
                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full text-xs">
                            {formatTime(debater.totalSpeakTime)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timer controls */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14"
            onClick={() => {
              if (!isInitialLoadComplete || !isSubscribed) return;
              const stepTime = steps[currentStepIndexRef.current]?.time || 0;
              const speakerMaxTime = steps[currentStepIndexRef.current]?.maxSpeakTime || 0;
              
              setIsRunning(false); // Local update
              setRemainingTime(stepTime); // Local update
              setSpeakerTimeRemaining(speakerMaxTime); // Local update
              // setCurrentSpeaker(null); // Optionally reset speaker on step reset
              // setActiveSpeakingTeam(null); // Optionally reset team on step reset
              
              updateLiveStateInSupabase({ 
                isRunning: false, 
                remainingTime: stepTime, 
                speakerTimeRemaining: speakerMaxTime,
                // currentSpeakerId: null, // Optional: reset these too
                // activeSpeakingTeam: null, // Optional: reset these too
                debaters: debatersRef.current.map(d => ({...d, isSpeaking: false})) // Ensure all are not speaking
              });
            }}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>

          <Button
            variant={isRunningRef.current ? "destructive" : "default"} // Use ref for UI consistency
            size="lg"
            className="h-14 w-14"
            onClick={() => handleSetIsRunning(!isRunningRef.current)} // isRunningRef ensures we toggle based on latest state
          >
            {isRunningRef.current ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
        </div>
      </Card>

      {/* Navigation controls */}
      <div className="flex justify-between mb-4">
        <Button
          variant="outline"
          className="w-32"
          onClick={() => handleStepChange(currentStepIndex - 1)}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          이전 단계
        </Button>

        <Button
          variant="outline"
          className="w-32"
          onClick={() => handleStepChange(currentStepIndex + 1)}
          disabled={false}
        >
          {currentStepIndex === steps.length - 1 ? (
            <>
              토론 종료
              <Check className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              다음 단계
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* 토론 종료 모달 */}
      {showDebateEndModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-center">토론이 끝났습니다</h3>
            
            {/* 토론자 활성화 상태인 경우 토론 시간 측정 결과 표시 */}
            {enableDebaters && debaters.length > 2 && (
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-center text-gray-700">토론자 발언 시간</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-blue-700">
                      {isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}
                    </h5>
                    {debaters
                      .filter(d => d.team === "찬성" || d.team === "긍정")
                      .sort((a, b) => b.totalSpeakTime - a.totalSpeakTime)
                      .map((debater) => (
                        <div key={debater.id} className="flex items-center justify-between bg-blue-50 p-2 rounded-md">
                          <span className="text-sm">{debater.name}</span>
                          <span className="text-sm font-medium text-blue-700">
                            {formatTime(debater.totalSpeakTime)}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-orange-700">
                      {isNegativeTeam(steps) ? "부정팀" : "반대팀"}
                    </h5>
                    {debaters
                      .filter(d => d.team === "반대" || d.team === "부정")
                      .sort((a, b) => b.totalSpeakTime - a.totalSpeakTime)
                      .map((debater) => (
                        <div key={debater.id} className="flex items-center justify-between bg-orange-50 p-2 rounded-md">
                          <span className="text-sm">{debater.name}</span>
                          <span className="text-sm font-medium text-orange-700">
                            {formatTime(debater.totalSpeakTime)}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowDebateEndModal(false)
                  router.push("/")
                }}
                className="w-28"
              >
                홈으로
              </Button>
              <Button 
                onClick={() => setShowDebateEndModal(false)}
                className="w-28"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
