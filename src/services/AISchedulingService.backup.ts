// AI Scheduling Service for ScheduleX Integration

import { 
  Task, 
  TimeSlot, 
  SchedulingPreferences, 
  AISchedulingSuggestion, 
  ScheduleOptimization,
  CalendarEvent 
} from '../types/calendar';
import { addDays, addMinutes, format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

class AISchedulingService {
  private readonly GEMINI_API_KEY: string;
  private readonly GEMINI_MODEL = 'gemini-1.5-flash-latest';

  constructor() {
    this.GEMINI_API_KEY = import.meta.env.VITE_APP_GEMINI_API_KEY || '';
  }

  // Generate AI-powered schedule suggestions
  async generateScheduleSuggestions(
    tasks: Task[],
    existingEvents: CalendarEvent[],
    preferences: SchedulingPreferences,
    dateRange: { start: Date; end: Date }
  ): Promise<ScheduleOptimization> {
    try {
      // 1. Analyze tasks and extract scheduling metadata
      const analyzedTasks = await this.analyzeTasks(tasks);
      
      // 2. Create simple suggestions using exact user-selected times
      const suggestions = this.createSimpleScheduleFromUserTimes(analyzedTasks);
      
      // 3. Create basic optimization result
      const optimization: ScheduleOptimization = {
        suggestions,
        conflictResolutions: [],
        scheduleScore: 100, // Perfect score since we're using user's exact choices
        optimizationInsights: [
          'Tasks scheduled at user-selected times',
          `${suggestions.length} tasks scheduled successfully`
        ],
        estimatedProductivity: 0.9,
        suggestedAdjustments: []
      };

      return optimization;
    } catch (error) {
      console.error('Error generating schedule suggestions:', error);
      throw error;
    }
  }

  // Create simple schedule using exact user-selected deadline times
  private createSimpleScheduleFromUserTimes(
    analyzedTasks: Array<Task & { analysis: any }>
  ): AISchedulingSuggestion[] {
    const suggestions: AISchedulingSuggestion[] = [];

    for (const task of analyzedTasks) {
      if (!task.deadline) {
        console.log(`⚠️ Skipping task "${task.title}" - no deadline time specified`);
        continue;
      }

      // Use the exact deadline time as the scheduling time
      const scheduledStart = new Date(task.deadline);
      const scheduledEnd = addMinutes(scheduledStart, task.duration);

      console.log(`📅 Scheduling "${task.title}" at user-selected time: ${format(scheduledStart, 'MMM do, yyyy HH:mm')} - ${format(scheduledEnd, 'HH:mm')}`);

      const suggestion: AISchedulingSuggestion = {
        id: `suggestion-${task.id}-${Date.now()}`,
        task,
        suggestedSlot: {
          start: scheduledStart,
          end: scheduledEnd,
          available: true
        },
        confidence: 1.0, // 100% confidence since it's user's choice
        reasoning: `Scheduled at your selected time: ${format(scheduledStart, 'MMM do, yyyy')} at ${format(scheduledStart, 'HH:mm')}. This respects your preferred timing for completing "${task.title}".`,
        alternatives: [], // No alternatives needed
        considerations: [
          'Scheduled at user-specified time',
          `Duration: ${task.duration} minutes`,
          `Priority: ${task.priority}`
        ]
      };

      suggestions.push(suggestion);
    }

    console.log(`✅ Created ${suggestions.length} simple schedule suggestions from user times`);
    return suggestions;
  }
      const suggestions = await this.generateTaskPlacements(
        analyzedTasks,
        allAvailableSlots,
        preferences
      );
      
      // 6. Optimize the overall schedule
      const optimization = this.optimizeSchedule(
        suggestions,
        preferences,
        dateRange
      );
      
      return optimization;
    } catch (error) {
      console.error('Error generating schedule suggestions:', error);
      throw error;
    }
  }

  // Analyze tasks using AI to extract scheduling insights
  private async analyzeTasks(tasks: Task[]): Promise<Array<Task & { analysis: any }>> {
    const analysisPrompt = `
You are an expert productivity and time management consultant. Analyze these tasks and provide detailed insights for optimal scheduling:

Tasks to analyze:
${tasks.map(task => `
- Title: "${task.title}"
- Description: "${task.description || 'No description'}"
- Duration: ${task.duration} minutes
- Priority: ${task.priority}
- Deadline: ${task.deadline ? format(task.deadline, 'MMMM do, yyyy') : 'No deadline'}
- Category: ${task.category || 'General'}
`).join('\n')}

For each task, analyze the specific nature of the activity and provide a JSON response with:
1. optimal_time_of_day: "early_morning" | "morning" | "late_morning" | "afternoon" | "evening" | "any"
2. focus_level_required: "low" | "medium" | "high" | "deep_focus"
3. energy_level_required: "low" | "medium" | "high" | "peak"
4. collaboration_needed: boolean
5. can_be_split: boolean
6. suggested_break_pattern: number (minutes between breaks)
7. scheduling_flexibility: "rigid" | "flexible" | "very_flexible"
8. estimated_cognitive_load: "light" | "moderate" | "heavy" | "intensive"
9. task_type: "creative" | "analytical" | "physical" | "social" | "routine" | "learning"
10. environment_preference: "quiet" | "collaborative" | "outdoor" | "flexible"

Consider the specific context:
- "breakfast" or meal-related tasks should be scheduled at appropriate meal times
- "contributions" or work tasks should align with productive hours
- Physical activities should consider energy levels and time of day
- Social activities should consider when others are typically available

IMPORTANT: Return ONLY a valid JSON array with analysis for each task in order. Do NOT wrap the response in markdown code blocks or add any extra formatting.
`;

    try {
      const response = await this.callGeminiAPI(analysisPrompt);
      
      // Clean the response - remove markdown code blocks if present
      const cleanedResponse = this.cleanJsonResponse(response);
      const analysis = JSON.parse(cleanedResponse);
      
      return tasks.map((task, index) => ({
        ...task,
        analysis: analysis[index] || this.getDefaultAnalysis()
      }));
    } catch (error) {
      console.error('Error analyzing tasks:', error);
      // Return tasks with default analysis if AI fails
      return tasks.map(task => ({
        ...task,
        analysis: this.getDefaultAnalysis()
      }));
    }
  }

  // Clean JSON response from AI - remove markdown code blocks
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.trim();
    
    // Remove opening ```json or ``` 
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    
    // Remove closing ```
    cleaned = cleaned.replace(/\s*```$/, '');
    
    return cleaned.trim();
  }

  // Find available time slots based on existing events and preferences
  private findAvailableTimeSlots(
    existingEvents: CalendarEvent[],
    preferences: SchedulingPreferences,
    dateRange: { start: Date; end: Date },
    tasks?: Task[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentDate = startOfDay(dateRange.start);
    const endDate = endOfDay(dateRange.end);

    console.log('🔍 Finding available time slots:');
    console.log('Date range:', {
      start: format(dateRange.start, 'MMM do, yyyy'),
      end: format(dateRange.end, 'MMM do, yyyy'),
      startTime: dateRange.start,
      endTime: dateRange.end
    });

    // Get all deadline dates to ensure we include them even if not working days
    const deadlineDates = new Set<string>();
    if (tasks) {
      tasks.forEach(task => {
        if (task.deadline && !task.isCompleted) {
          deadlineDates.add(format(task.deadline, 'yyyy-MM-dd'));
        }
      });
    }
    
    console.log('Deadline dates to include:', Array.from(deadlineDates));

    while (currentDate <= endDate) {
      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      const isWorkingDay = preferences.workingDays.includes(currentDate.getDay());
      const isDeadlineDay = deadlineDates.has(currentDateStr);
      
      console.log(`Checking ${format(currentDate, 'MMM do, yyyy')}: working=${isWorkingDay}, deadline=${isDeadlineDay}`);
      
      // Include day if it's a working day OR a deadline day
      if (isWorkingDay || isDeadlineDay) {
        const daySlots = this.findDailyAvailableSlots(
          currentDate,
          existingEvents,
          preferences
        );
        console.log(`Added ${daySlots.length} slots for ${format(currentDate, 'MMM do, yyyy')}`);
        slots.push(...daySlots);
      }
      currentDate = addDays(currentDate, 1);
    }

    console.log(`Total slots generated: ${slots.length}`);
    slots.forEach(slot => {
      console.log(`- ${format(slot.start, 'MMM do, yyyy HH:mm')} to ${format(slot.end, 'HH:mm')}`);
    });

    return slots;
  }

  // Find available slots for a specific day
  private findDailyAvailableSlots(
    date: Date,
    existingEvents: CalendarEvent[],
    preferences: SchedulingPreferences
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    // Get working hours for the day
    const workStart = this.parseTimeToDate(date, preferences.workingHours.start);
    const workEnd = this.parseTimeToDate(date, preferences.workingHours.end);
    
    // Get events for this day
    const dayEvents = existingEvents.filter(event => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      return isWithinInterval(eventStart, { start: startOfDay(date), end: endOfDay(date) }) ||
             isWithinInterval(eventEnd, { start: startOfDay(date), end: endOfDay(date) });
    });

    // Sort events by start time
    dayEvents.sort((a, b) => 
      new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );

    // Find gaps between events
    let currentTime = new Date(workStart);
    
    for (const event of dayEvents) {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      
      // If event starts after current time, there's a potential slot
      if (eventStart > currentTime) {
        const slotEnd = new Date(Math.min(eventStart.getTime(), workEnd.getTime()));
        if (slotEnd > currentTime) {
          slots.push({
            start: new Date(currentTime),
            end: slotEnd,
            available: true
          });
        }
      }
      
      // Move current time to after this event
      currentTime = new Date(Math.max(currentTime.getTime(), eventEnd.getTime()));
    }
    
    // Check for remaining time after last event
    if (currentTime < workEnd) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(workEnd),
        available: true
      });
    }

    return slots;
  }

  // Break large available slots into smaller, more specific time slots
  private createDetailedTimeSlots(availableSlots: TimeSlot[], taskDuration: number): TimeSlot[] {
    const detailedSlots: TimeSlot[] = [];
    const slotInterval = 60; // 60-minute intervals
    
    for (const slot of availableSlots) {
      const slotDurationMinutes = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
      
      // If slot is shorter than task duration + buffer, keep as is
      if (slotDurationMinutes < taskDuration + 30) {
        detailedSlots.push(slot);
        continue;
      }
      
      // Break into smaller slots
      let currentStart = new Date(slot.start);
      while (currentStart.getTime() + (taskDuration + 30) * 60 * 1000 <= slot.end.getTime()) {
        const currentEnd = addMinutes(currentStart, slotInterval);
        
        detailedSlots.push({
          start: new Date(currentStart),
          end: new Date(Math.min(currentEnd.getTime(), slot.end.getTime())),
          available: true
        });
        
        currentStart = addMinutes(currentStart, slotInterval);
      }
    }
    
    return detailedSlots;
  }

  // Create preferred time slots based on user-selected deadline times
  private createPreferredSlotsFromDeadlines(tasks: Task[]): TimeSlot[] {
    const preferredSlots: TimeSlot[] = [];
    
    for (const task of tasks) {
      if (task.deadline && !task.isCompleted) {
        // Create a slot that starts at the exact deadline time
        const slotStart = new Date(task.deadline);
        // Make the slot longer to accommodate task duration + buffer time
        const slotEnd = addMinutes(slotStart, task.duration + 30); // Add 30 min buffer
        
        console.log(`🎯 Creating preferred slot for "${task.title}" at exact deadline time: ${format(slotStart, 'MMM do, yyyy HH:mm')} - ${format(slotEnd, 'HH:mm')}`);
        
        preferredSlots.push({
          start: slotStart,
          end: slotEnd,
          available: true
        });
      }
    }
    
    console.log(`Created ${preferredSlots.length} preferred slots from deadline times`);
    return preferredSlots;
  }

  // Filter out slots that occur after any task deadline
  private filterSlotsAfterDeadlines(slots: TimeSlot[], tasks: Task[]): TimeSlot[] {
    if (!tasks || tasks.length === 0) {
      return slots;
    }

    // Find the earliest deadline
    let earliestDeadline: Date | null = null;
    for (const task of tasks) {
      if (task.deadline && !task.isCompleted) {
        if (!earliestDeadline || task.deadline < earliestDeadline) {
          earliestDeadline = task.deadline;
        }
      }
    }

    if (!earliestDeadline) {
      return slots;
    }

    // Filter out slots that start after the earliest deadline
    const filteredSlots = slots.filter(slot => {
      const isAfterDeadline = slot.start > earliestDeadline!;
      if (isAfterDeadline) {
        console.log(`🚫 Removing slot ${format(slot.start, 'MMM do, yyyy HH:mm')} - after earliest deadline ${format(earliestDeadline!, 'MMM do, yyyy HH:mm')}`);
      }
      return !isAfterDeadline;
    });

    console.log(`Filtered ${slots.length - filteredSlots.length} slots that were after deadlines`);
    return filteredSlots;
  }

  // Generate AI-powered task placements
  private async generateTaskPlacements(
    analyzedTasks: Array<Task & { analysis: any }>,
    availableSlots: TimeSlot[],
    preferences: SchedulingPreferences
  ): Promise<AISchedulingSuggestion[]> {
    const suggestions: AISchedulingSuggestion[] = [];

    // Sort tasks by priority and deadline
    const sortedTasks = this.sortTasksByPriority(analyzedTasks);

    for (const task of sortedTasks) {
      const suggestion = await this.findOptimalSlotForTask(
        task,
        availableSlots,
        preferences,
        suggestions // to avoid conflicts
      );
      
      if (suggestion) {
        suggestions.push(suggestion);
        // Remove the used slot from available slots
        this.removeUsedSlot(availableSlots, suggestion.suggestedSlot);
      }
    }

    return suggestions;
  }

  // Find optimal slot for a specific task
  private async findOptimalSlotForTask(
    task: Task & { analysis: any },
    availableSlots: TimeSlot[],
    preferences: SchedulingPreferences,
    _existingSuggestions: AISchedulingSuggestion[]
  ): Promise<AISchedulingSuggestion | null> {
    console.log(`\n=== Finding optimal slot for task: "${task.title}" ===`);
    console.log('Task deadline:', task.deadline);
    console.log('Available slots count:', availableSlots.length);
    
    // Break large slots into smaller hourly slots for better time matching
    const detailedSlots = this.createDetailedTimeSlots(availableSlots, task.duration);
    console.log('Detailed slots count:', detailedSlots.length);
    
    // Filter slots that can accommodate the task
    const suitableSlots = detailedSlots.filter(slot => {
      const duration = slot.end.getTime() - slot.start.getTime();
      const requiredTime = (task.duration + preferences.bufferTime) * 60 * 1000;
      const hasEnoughTime = duration >= requiredTime;
      
      console.log(`Checking slot ${format(slot.start, 'MMM do, yyyy HH:mm')} - Duration: ${Math.round(duration / 60000)}min, Required: ${Math.round(requiredTime / 60000)}min, Enough time: ${hasEnoughTime}`);
      
      // Check deadline constraint
      let meetsDeadline = true;
      if (task.deadline) {
        // Check if slot is on the same day as deadline
        const taskEndTime = addMinutes(slot.start, task.duration);
        const deadlineDay = format(task.deadline, 'yyyy-MM-dd');
        const slotDay = format(slot.start, 'yyyy-MM-dd');
        
        console.log(`Checking slot ${format(slot.start, 'MMM do, yyyy HH:mm')} against deadline ${format(task.deadline, 'MMM do, yyyy HH:mm')}`);
        console.log(`Slot day: ${slotDay}, Deadline day: ${deadlineDay}, Same day: ${deadlineDay === slotDay}`);
        
        if (deadlineDay === slotDay) {
          // Same day as deadline - ALWAYS allow scheduling during working hours on deadline day
          meetsDeadline = true;
          console.log(`✅ Slot ACCEPTED - same day as deadline (${deadlineDay})`);
        } else if (slot.start < task.deadline) {
          // Different day and before deadline - allow if task completes before deadline day starts
          const deadlineDayStart = startOfDay(task.deadline);
          meetsDeadline = taskEndTime <= deadlineDayStart;
          console.log(`${meetsDeadline ? '✅' : '❌'} Slot ${meetsDeadline ? 'accepted' : 'rejected'} - before deadline day`);
        } else {
          // After deadline - reject
          meetsDeadline = false;
          console.log(`❌ Slot rejected - after deadline`);
        }
        
        if (!meetsDeadline) {
          console.log(`Final: Slot ${format(slot.start, 'MMM do, yyyy HH:mm')} rejected - task would end after deadline`);
        } else {
          console.log(`Final: Slot ${format(slot.start, 'MMM do, yyyy HH:mm')} ACCEPTED`);
        }
      }
      
      return hasEnoughTime && meetsDeadline;
    });

    console.log(`Suitable slots after filtering: ${suitableSlots.length}`);
    suitableSlots.forEach(slot => {
      console.log(`- ${format(slot.start, 'MMM do, yyyy HH:mm')} to ${format(slot.end, 'HH:mm')}`);
    });

    if (suitableSlots.length === 0) {
      console.log('No suitable slots found for task');
      return null;
    }

    // Score each slot based on task analysis and preferences
    const scoredSlots = suitableSlots.map(slot => ({
      slot,
      score: this.scoreSlotForTask(slot, task, preferences)
    }));

    // Sort by score (highest first)
    scoredSlots.sort((a, b) => b.score - a.score);

    console.log('Top 3 scored slots:');
    scoredSlots.slice(0, 3).forEach((scored, idx) => {
      console.log(`${idx + 1}. ${format(scored.slot.start, 'MMM do, yyyy HH:mm')} - Score: ${scored.score}`);
    });

    const bestSlot = scoredSlots[0].slot;
    
    // Create the suggested time slot for the task
    const suggestedSlot: TimeSlot = {
      start: new Date(bestSlot.start),
      end: addMinutes(bestSlot.start, task.duration),
      available: true
    };

    // Generate AI reasoning
    const reasoning = await this.generateSchedulingReasoning(task, suggestedSlot, scoredSlots[0].score);

    const suggestion: AISchedulingSuggestion = {
      id: `suggestion-${task.id}-${Date.now()}`,
      task,
      suggestedSlot,
      confidence: Math.min(scoredSlots[0].score / 100, 1),
      reasoning,
      alternatives: scoredSlots.slice(1, 4).map(s => ({
        start: new Date(s.slot.start),
        end: addMinutes(s.slot.start, task.duration),
        available: true
      })),
      considerations: this.generateConsiderations(task, suggestedSlot)
    };

    return suggestion;
  }

  // Score a time slot for a specific task
  private scoreSlotForTask(
    slot: TimeSlot,
    task: Task & { analysis: any },
    preferences: SchedulingPreferences
  ): number {
    let score = 50; // Base score

    const hour = slot.start.getHours();
    const analysis = task.analysis;

    // Time of day preference scoring (improved)
    if (analysis.optimal_time_of_day === 'early_morning' && hour >= 6 && hour < 8) {
      score += 30; // Perfect for breakfast, early activities
    } else if (analysis.optimal_time_of_day === 'morning' && hour >= 8 && hour < 12) {
      score += 25; // Good for productive work
    } else if (analysis.optimal_time_of_day === 'late_morning' && hour >= 10 && hour < 12) {
      score += 20; // Mid-morning activities
    } else if (analysis.optimal_time_of_day === 'afternoon' && hour >= 12 && hour < 17) {
      score += 20; // Post-lunch activities
    } else if (analysis.optimal_time_of_day === 'evening' && hour >= 17 && hour < 22) {
      score += 20; // Evening activities
    } else if (analysis.optimal_time_of_day === 'any') {
      score += 10; // Flexible timing
    }
    
    // Task-specific time preferences based on content
    const taskTitle = task.title.toLowerCase();
    if (taskTitle.includes('breakfast') || taskTitle.includes('morning')) {
      if (hour >= 7 && hour <= 9) {
        score += 40; // Strong preference for morning meals
      } else if (hour > 10) {
        score -= 30; // Penalty for very late breakfast
      }
    }
    
    if (taskTitle.includes('lunch')) {
      if (hour >= 11 && hour <= 14) {
        score += 30;
      } else {
        score -= 15;
      }
    }
    
    if (taskTitle.includes('dinner')) {
      if (hour >= 17 && hour <= 20) {
        score += 30;
      } else {
        score -= 15;
      }
    }

    // Priority scoring
    switch (task.priority) {
      case 'urgent':
        score += 30;
        break;
      case 'high':
        score += 20;
        break;
      case 'medium':
        score += 10;
        break;
      case 'low':
        score += 5;
        break;
    }

    // Deadline urgency scoring (DEADLINE DAY FIRST approach)
    if (task.deadline) {
      const isDeadlineDay = format(task.deadline, 'yyyy-MM-dd') === format(slot.start, 'yyyy-MM-dd');
      const daysUntilDeadline = (task.deadline.getTime() - slot.start.getTime()) / (1000 * 60 * 60 * 24);
      
      // Check if this slot is at the EXACT deadline time (preferred slot)
      const isExactDeadlineTime = Math.abs(slot.start.getTime() - task.deadline.getTime()) < 60000; // Within 1 minute
      
      console.log(`Scoring slot ${format(slot.start, 'MMM do, yyyy HH:mm')} for task "${task.title}"`);
      console.log(`Task deadline: ${format(task.deadline, 'MMM do, yyyy HH:mm')}`);
      console.log(`Is deadline day: ${isDeadlineDay}`);
      console.log(`Is exact deadline time: ${isExactDeadlineTime}`);
      console.log(`Days until deadline: ${daysUntilDeadline.toFixed(2)}`);
      
      if (isExactDeadlineTime) {
        // MAXIMUM preference for exact deadline time - this should always win
        score += 1000; // Massive bonus for exact time match
        console.log(`🎯 EXACT DEADLINE TIME BONUS: +1000 points! Total score: ${score}`);
      } else if (isDeadlineDay) {
        // MASSIVELY prefer scheduling on the actual deadline day
        score += 500; // INCREASED from 200 to 500 for even stronger preference
        console.log(`✅ DEADLINE DAY BONUS: +500 points! Total score: ${score}`);
        
        // BONUS: Prefer scheduling closer to the deadline time
        const deadlineTime = task.deadline.getHours() * 60 + task.deadline.getMinutes();
        const slotTime = slot.start.getHours() * 60 + slot.start.getMinutes();
        const timeDifference = Math.abs(deadlineTime - slotTime); // minutes apart
        
        // Give bonus for being closer to deadline time (max 100 points)
        const timeProximityBonus = Math.max(0, 100 - Math.floor(timeDifference / 10));
        score += timeProximityBonus;
        console.log(`🕒 Time proximity bonus: +${timeProximityBonus} points (${timeDifference} min from deadline time)`);
        
      } else if (daysUntilDeadline >= 0 && daysUntilDeadline < 1) {
        // Day before deadline - only if deadline day is full
        score += 50; // Much lower than deadline day
        console.log(`Day before deadline: +50 points`);
      } else if (daysUntilDeadline >= 1 && daysUntilDeadline < 2) {
        // 2 days before - even lower preference
        score += 20;
        console.log(`2 days before deadline: +20 points`);
      } else if (daysUntilDeadline < 0) {
        // Past deadline - heavy penalty
        score -= 1000; // Massive penalty for scheduling after deadline
        console.log(`❌ Past deadline: -1000 points`);
      } else {
        // More than 2 days before - penalty to discourage early scheduling
        const penalty = Math.round(daysUntilDeadline * 20); // INCREASED penalty from 10 to 20
        score -= penalty; 
        console.log(`${daysUntilDeadline.toFixed(1)} days early: -${penalty} points`);
      }
      
      console.log(`Final score for this slot: ${score}`);
    }

    // Focus time preference
    if (preferences.focusTimeBlocks) {
      for (const focusBlock of preferences.focusTimeBlocks) {
        if (this.isTimeInFocusBlock(slot.start, focusBlock) && 
            analysis.focus_level_required === 'high') {
          score += 15;
        }
      }
    }

    // Duration fit scoring
    const slotDuration = slot.end.getTime() - slot.start.getTime();
    const taskDuration = task.duration * 60 * 1000;
    const durationRatio = taskDuration / slotDuration;
    
    if (durationRatio > 0.8 && durationRatio <= 1) {
      score += 10; // Good fit
    } else if (durationRatio > 0.5 && durationRatio <= 0.8) {
      score += 5; // Decent fit
    }

    return score;
  }

  // Generate AI reasoning for scheduling decision
  private async generateSchedulingReasoning(
    task: Task & { analysis: any },
    slot: TimeSlot,
    score: number
  ): Promise<string> {
    const taskDate = slot.start;
    const dayName = format(taskDate, 'EEEE');
    const timeOfDay = format(slot.start, 'h:mm a');
    
    const prompt = `
You are an expert productivity coach. Provide a specific, actionable explanation for why this time slot is optimal for the given task.

Task Details:
- Task: "${task.title}"
- Description: "${task.description || 'No description provided'}"
- Duration: ${task.duration} minutes
- Priority: ${task.priority}
- Category: ${task.category || 'General'}
- Deadline: ${task.deadline ? format(task.deadline, 'MMMM do, yyyy') : 'No specific deadline'}

Scheduled Time: ${format(slot.start, 'EEEE, MMMM do, yyyy')} at ${timeOfDay}
Confidence Score: ${Math.round(score)}/100

Consider these factors in your response:
1. Whether this task is scheduled on its deadline day or earlier (and why)
2. The specific nature of the task and what it involves
3. The optimal time of day for this type of activity
4. How the timing aligns with productivity patterns
5. Any relevant contextual factors (breakfast timing, work schedules, etc.)

If the task is scheduled before its deadline, explain why (e.g., "better availability", "conflict avoidance").
If scheduled on the deadline day, emphasize that this respects the user's intended timing.

Provide a compelling, specific explanation (2-3 sentences) that shows deep understanding of the task and optimal scheduling. Make it personal and actionable.

Example format: "This ${timeOfDay} slot on ${dayName} is ideal for [task name] because [specific reason 1]. [Specific reason 2 about timing/productivity]. [Additional insight about task completion or benefits]."
`;

    try {
      const reasoning = await this.callGeminiAPI(prompt);
      return reasoning.trim();
    } catch (error) {
      // Fallback with more specific reasoning
      const timeContext = parseInt(format(slot.start, 'H')) < 12 ? 'morning' : 
                         parseInt(format(slot.start, 'H')) < 17 ? 'afternoon' : 'evening';
      
      return `This ${timeContext} time slot on ${dayName} aligns well with the ${task.priority} priority of "${task.title}". The ${task.duration}-minute duration provides adequate time for completion while maintaining optimal energy levels for this type of task.`;
    }
  }

  // Optimize the overall schedule
  private optimizeSchedule(
    suggestions: AISchedulingSuggestion[],
    _preferences: SchedulingPreferences,
    dateRange: { start: Date; end: Date }
  ): ScheduleOptimization {
    const totalTasks = suggestions.length;
    const scheduledTasks = suggestions.filter(s => s.confidence > 0.3).length;
    const unscheduledTasks = suggestions
      .filter(s => s.confidence <= 0.3)
      .map(s => s.task);

    // Calculate workload balance
    const workloadBalance = this.calculateWorkloadBalance(suggestions, dateRange);

    // Detect conflicts
    const conflicts = this.detectSchedulingConflicts(suggestions);

    return {
      totalTasks,
      scheduledTasks,
      unscheduledTasks,
      suggestions,
      workloadBalance,
      conflicts
    };
  }

  // Calculate workload balance across days
  private calculateWorkloadBalance(
    suggestions: AISchedulingSuggestion[],
    dateRange: { start: Date; end: Date }
  ): Array<{
    date: string;
    hours: number;
    taskCount: number;
    intensity: 'light' | 'moderate' | 'heavy' | 'overloaded';
  }> {
    const dailyWorkload = new Map<string, { hours: number; taskCount: number }>();
    
    let currentDate = startOfDay(dateRange.start);
    const endDate = endOfDay(dateRange.end);

    // Initialize all days
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      dailyWorkload.set(dateKey, { hours: 0, taskCount: 0 });
      currentDate = addDays(currentDate, 1);
    }

    // Calculate workload for each day
    suggestions.forEach(suggestion => {
      if (suggestion.confidence > 0.3) {
        const dateKey = format(suggestion.suggestedSlot.start, 'yyyy-MM-dd');
        const existing = dailyWorkload.get(dateKey);
        if (existing) {
          existing.hours += suggestion.task.duration / 60;
          existing.taskCount += 1;
        }
      }
    });

    // Convert to result format with intensity classification
    return Array.from(dailyWorkload.entries()).map(([date, workload]) => ({
      date,
      hours: workload.hours,
      taskCount: workload.taskCount,
      intensity: this.classifyWorkloadIntensity(workload.hours)
    }));
  }

  // Classify workload intensity
  private classifyWorkloadIntensity(hours: number): 'light' | 'moderate' | 'heavy' | 'overloaded' {
    if (hours <= 2) return 'light';
    if (hours <= 4) return 'moderate';
    if (hours <= 6) return 'heavy';
    return 'overloaded';
  }

  // Detect scheduling conflicts
  private detectSchedulingConflicts(suggestions: AISchedulingSuggestion[]): Array<{
    type: 'overlap' | 'deadline_conflict' | 'dependency_violation';
    description: string;
    affectedTasks: string[];
    severity: 'low' | 'medium' | 'high';
  }> {
    const conflicts: Array<{
      type: 'overlap' | 'deadline_conflict' | 'dependency_violation';
      description: string;
      affectedTasks: string[];
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check for time overlaps
    for (let i = 0; i < suggestions.length; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        const suggestion1 = suggestions[i];
        const suggestion2 = suggestions[j];
        
        if (this.doTimesSlotsOverlap(suggestion1.suggestedSlot, suggestion2.suggestedSlot)) {
          conflicts.push({
            type: 'overlap',
            description: `Tasks "${suggestion1.task.title}" and "${suggestion2.task.title}" have overlapping time slots`,
            affectedTasks: [suggestion1.task.id, suggestion2.task.id],
            severity: 'high'
          });
        }
      }
    }

    // Check for deadline conflicts
    suggestions.forEach(suggestion => {
      if (suggestion.task.deadline && 
          suggestion.suggestedSlot.end > suggestion.task.deadline) {
        conflicts.push({
          type: 'deadline_conflict',
          description: `Task "${suggestion.task.title}" is scheduled after its deadline`,
          affectedTasks: [suggestion.task.id],
          severity: 'high'
        });
      }
    });

    return conflicts;
  }

  // Utility methods
  private getDefaultAnalysis() {
    return {
      optimal_time_of_day: 'any',
      focus_level_required: 'medium',
      energy_level_required: 'medium',
      collaboration_needed: false,
      can_be_split: true,
      suggested_break_pattern: 60,
      scheduling_flexibility: 'flexible',
      estimated_cognitive_load: 'moderate'
    };
  }

  private sortTasksByPriority(tasks: Array<Task & { analysis: any }>): Array<Task & { analysis: any }> {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return tasks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by deadline (earlier deadlines first)
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      
      return 0;
    });
  }

  private parseTimeToDate(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private isTimeInFocusBlock(time: Date, focusBlock: { start: string; end: string; days: number[] }): boolean {
    const day = time.getDay();
    if (!focusBlock.days.includes(day)) return false;
    
    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    const [startHour, startMin] = focusBlock.start.split(':').map(Number);
    const [endHour, endMin] = focusBlock.end.split(':').map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;
    
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  private removeUsedSlot(availableSlots: TimeSlot[], usedSlot: TimeSlot): void {
    const index = availableSlots.findIndex(slot => 
      slot.start.getTime() <= usedSlot.start.getTime() && 
      slot.end.getTime() >= usedSlot.end.getTime()
    );
    
    if (index !== -1) {
      const originalSlot = availableSlots[index];
      availableSlots.splice(index, 1);
      
      // Add remaining parts of the slot if any
      if (originalSlot.start < usedSlot.start) {
        availableSlots.push({
          start: originalSlot.start,
          end: usedSlot.start,
          available: true
        });
      }
      
      if (usedSlot.end < originalSlot.end) {
        availableSlots.push({
          start: usedSlot.end,
          end: originalSlot.end,
          available: true
        });
      }
    }
  }

  private doTimesSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    return slot1.start < slot2.end && slot2.start < slot1.end;
  }

  private generateConsiderations(task: Task & { analysis: any }, slot: TimeSlot): string[] {
    const considerations: string[] = [];
    
    if (task.analysis.focus_level_required === 'high') {
      considerations.push('This task requires high focus - ensure minimal distractions');
    }
    
    if (task.analysis.energy_level_required === 'high') {
      considerations.push('Schedule when your energy levels are typically highest');
    }
    
    if (task.analysis.collaboration_needed) {
      considerations.push('Coordinate with team members for availability');
    }
    
    if (task.deadline) {
      const daysUntilDeadline = (task.deadline.getTime() - slot.start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline < 2) {
        considerations.push('Urgent: Deadline is approaching soon');
      }
    }
    
    return considerations;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }],
            }],
          }),
        }
      );

      const data = await response.json();
      
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

export default AISchedulingService;
