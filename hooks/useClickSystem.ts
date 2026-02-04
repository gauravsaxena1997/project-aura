import { useState, useCallback, useRef } from 'react';
import { INTERACTION_METHODS, InteractionType } from '../config/click.config';
import { ClickState } from '../types';

export const useClickSystem = () => {
    const [clickState, setClickState] = useState<ClickState>({
        count: 0,
        lastClickTime: 0,
        source: null
    });

    const triggerInteraction = useCallback((sourceId: InteractionType) => {
        const now = Date.now();

        // Find config for this source
        const method = Object.values(INTERACTION_METHODS).find(m => m.id === sourceId);

        if (!method || !method.enabled) return; // Guard against disabled/unknown sources

        // Check generic cooldown or specific cooldown
        const cooldown = method.cooldownMs;

        // Note: Simple global lastClick verification might be too restrictive if we want independent cooldowns,
        // but for a unified click system, global cooldown prevents accidental double-triggering across modalities.
        if (now - clickState.lastClickTime > cooldown) {
            setClickState(prev => ({
                count: prev.count + 1,
                lastClickTime: now,
                source: sourceId as 'tap' | 'blink' // Cast to match stricter type if needed
            }));

            return true; // Click registered
        }

        return false; // Cooldown active
    }, [clickState.lastClickTime]);

    return {
        clickState,
        triggerInteraction
    };
};
