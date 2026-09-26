"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  backupGuestDraft,
  clearGuestBackup,
  clearGuestSaveFlags,
  dismissAccountMerge,
  getActivePlanSnapshot,
  hasGuestOrigin,
  isAccountMergeDismissed,
  markGuestOrigin,
  readGuestBackup,
  writeActivePlan,
  type StoredPlan,
} from "@/lib/trip-planner-storage";
import {
  validateCategories,
  validateDetails,
} from "@/lib/trip-planner-model";
import { applyPendingBookedFlights } from "@/lib/flights-itinerary";
import { applyPendingBookedStays } from "@/lib/stays-itinerary";
import {
  accountSaveIntent,
  isReasonableTripDraft,
  planATripHref,
  storedPlanFromTrip,
  TRIP_LIMIT_CODE,
  TRIPS_ACCOUNT_UNAVAILABLE,
  tripCapacityMessage,
  tripWriteFromPlan,
  type TripRecord,
} from "@/lib/trip-record";

export type TripSaveMode =
  | "checking"
  | "local"
  | "offer"
  | "declined"
  | "pending"
  | "saving"
  | "saved"
  | "unavailable"
  /** A new trip hit the saved-trip limit (5 free). The draft stays in this browser. */
  | "limit"
  | "error";

export type RemoteTripState =
  | "idle"
  | "loading"
  | "ready"
  | "missing"
  | "unavailable"
  | "error";

type Options = {
  plan: StoredPlan;
  flexibleOn: boolean;
  urlTripId: string | null;
};

function detailsReady(state: StoredPlan["state"], flexibleOn: boolean): boolean {
  if (validateCategories(state)) return false;
  return Object.keys(validateDetails(state, flexibleOn)).length === 0;
}

/**
 * Guest drafts stay in localStorage. Signed-in readers sync step 4 to
 * Firestore. A draft started while signed out is offered as a merge after login.
 */
export function useTripSync({ plan, flexibleOn, urlTripId }: Options) {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState<TripSaveMode>("checking");
  const [saveDetail, setSaveDetail] = useState<string | null>(null);
  const [remote, setRemote] = useState<RemoteTripState>(
    urlTripId ? "loading" : "idle",
  );
  const [guestBackup, setGuestBackup] = useState<StoredPlan | null>(null);
  const suppressUrlTrip = useRef<string | null>(null);
  const loadedUrlTrip = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const authRejectedRef = useRef(false);
  const unavailableRef = useRef(false);
  const limitRef = useRef(false);
  const saveGen = useRef(0);
  const tripIdRef = useRef<string | null>(plan.tripId);
  tripIdRef.current = plan.tripId;

  const refreshBackup = useCallback(() => {
    setGuestBackup(readGuestBackup());
  }, []);

  useEffect(() => {
    refreshBackup();
  }, [plan.tripId, remote, refreshBackup]);

  useEffect(() => {
    if (status === "unauthenticated") {
      authRejectedRef.current = false;
      if (plan.state.destination.trim()) markGuestOrigin();
    }
  }, [status, plan.state.destination]);

  const replaceTripUrl = useCallback(
    (id: string | null) => {
      if (typeof window === "undefined") return;
      const current = new URL(window.location.href).searchParams.get("trip");
      const nextId = id || null;
      if ((current || null) === nextId) return;
      router.replace(planATripHref(id), { scroll: false });
    },
    [router],
  );

  const dismissUrlTrip = useCallback(() => {
    if (urlTripId) suppressUrlTrip.current = urlTripId;
    loadedUrlTrip.current = null;
    setRemote("idle");
    replaceTripUrl(null);
  }, [replaceTripUrl, urlTripId]);

  useEffect(() => {
    if (!urlTripId) {
      setRemote("idle");
      return;
    }
    if (status === "loading") return;
    if (status !== "authenticated") {
      setRemote("idle");
      return;
    }
    if (suppressUrlTrip.current === urlTripId) return;
    if (loadedUrlTrip.current === urlTripId) {
      setRemote("ready");
      return;
    }

    // A signed-in saved trip must always be refreshed from the account.
    // Do not trust the browser's active-plan cache just because the trip id matches:
    // it can contain stale destination/title data from an earlier edit.
    const current = getActivePlanSnapshot();

    let cancelled = false;
    setRemote("loading");
    (async () => {
      try {
        const res = await fetch(`/api/trips/${encodeURIComponent(urlTripId)}`);
        if (cancelled || suppressUrlTrip.current === urlTripId) return;
        if (res.status === 404) {
          setRemote("missing");
          return;
        }
        if (res.status === 503) {
          setRemote("unavailable");
          return;
        }
        if (res.status === 401) {
          authRejectedRef.current = true;
          setRemote("idle");
          setMode("local");
          return;
        }
        if (!res.ok) {
          setRemote("error");
          return;
        }
        const data = (await res.json()) as { trip?: TripRecord };
        if (cancelled || suppressUrlTrip.current === urlTripId) return;
        if (!data.trip) {
          setRemote("error");
          return;
        }
        const latest = getActivePlanSnapshot();
        if (
          latest &&
          !latest.tripId &&
          latest.step === 4 &&
          latest.state.destination.trim()
        ) {
          backupGuestDraft(latest);
          setGuestBackup({ ...latest });
        }
        loadedUrlTrip.current = urlTripId;
        writeActivePlan(storedPlanFromTrip(data.trip));
        applyPendingBookedStays(urlTripId);
      applyPendingBookedFlights(urlTripId);
        clearGuestSaveFlags();
        setRemote("ready");
      } catch {
        if (!cancelled) setRemote("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlTripId, status]);

  const persist = useCallback(async () => {
    if (status !== "authenticated" || authRejectedRef.current) return;
    const current = getActivePlanSnapshot();
    if (!current || !isReasonableTripDraft(current)) return;
    if (!detailsReady(current.state, flexibleOn)) return;
    if (urlTripId && remote !== "ready" && current.tripId !== urlTripId) return;
    const intent = accountSaveIntent({
      authenticated: true,
      tripId: current.tripId,
      step: current.step,
      hasDestination: Boolean(current.state.destination.trim()),
      guestOrigin: hasGuestOrigin(),
      dismissed: isAccountMergeDismissed(),
    });
    if (intent !== "autosave") return;

    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    setMode("saving");
    setSaveDetail(null);
    try {
      const body = JSON.stringify(tripWriteFromPlan(current, flexibleOn));
      const id = tripIdRef.current;
      const res = await fetch(id ? `/api/trips/${encodeURIComponent(id)}` : "/api/trips", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.status === 503) {
        unavailableRef.current = true;
        setSaveDetail(TRIPS_ACCOUNT_UNAVAILABLE);
        setMode("unavailable");
        return;
      }
      if (res.status === 401) {
        authRejectedRef.current = true;
        setMode("local");
        return;
      }
      if (res.status === 404 && id) {
        const latest = getActivePlanSnapshot();
        if (latest?.tripId === id) {
          writeActivePlan({ ...latest, tripId: null });
        }
        tripIdRef.current = null;
        markGuestOrigin();
        setMode("offer");
        return;
      }
      if (!res.ok) {
        let detail: string | null = null;
        let code: string | null = null;
        try {
          const data = (await res.json()) as { error?: string; code?: string };
          detail = typeof data.error === "string" ? data.error : null;
          code = typeof data.code === "string" ? data.code : null;
        } catch {
          detail = null;
        }
        if (res.status === 409 && code === TRIP_LIMIT_CODE && !id) {
          limitRef.current = true;
          setSaveDetail(detail || tripCapacityMessage(Number.POSITIVE_INFINITY));
          setMode("limit");
          return;
        }
        if (res.status === 409 && !detail) {
          detail = tripCapacityMessage(Number.POSITIVE_INFINITY);
        }
        setSaveDetail(detail);
        setMode("error");
        return;
      }
      const data = (await res.json()) as { trip?: TripRecord };
      const savedId = data.trip?.id;
      if (!id && savedId) {
        tripIdRef.current = savedId;
        const latest = getActivePlanSnapshot();
        if (latest && latest.tripId !== savedId) {
          writeActivePlan({ ...latest, tripId: savedId });
        }
        loadedUrlTrip.current = savedId;
        replaceTripUrl(savedId);
      }
      unavailableRef.current = false;
      clearGuestSaveFlags();
      setSaveDetail(null);
      setMode("saved");
    } catch {
      setSaveDetail(null);
      setMode("error");
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void persist();
      }
    }
  }, [flexibleOn, remote, replaceTripUrl, status, urlTripId]);

  const planKey = JSON.stringify({
    step: plan.step,
    state: plan.state,
    items: plan.items,
    packingNotes: plan.packingNotes,
    title: plan.title,
    titleCustom: plan.titleCustom,
    tripId: plan.tripId,
  });

  useEffect(() => {
    if (status === "loading") {
      setMode("checking");
      return;
    }

    const intent = accountSaveIntent({
      authenticated: status === "authenticated",
      tripId: plan.tripId,
      step: plan.step,
      hasDestination: Boolean(plan.state.destination.trim()),
      guestOrigin: hasGuestOrigin(),
      dismissed: isAccountMergeDismissed(),
    });

    if (intent === "local") {
      setMode("local");
      return;
    }
    if (intent === "offer") {
      setMode("offer");
      return;
    }
    if (intent === "declined") {
      setMode("declined");
      return;
    }
    if (intent !== "autosave") return;
    if (authRejectedRef.current) {
      setMode("local");
      return;
    }
    if (unavailableRef.current) {
      setSaveDetail(TRIPS_ACCOUNT_UNAVAILABLE);
      setMode("unavailable");
      return;
    }
    // At the saved-trip limit a new trip stays local until the reader retries.
    if (limitRef.current && !plan.tripId) {
      setMode("limit");
      return;
    }
    if (urlTripId && remote !== "ready" && plan.tripId !== urlTripId) return;
    if (urlTripId && (remote === "loading" || remote === "missing")) return;
    if (!detailsReady(plan.state, flexibleOn)) return;

    setMode((current) => (current === "saving" ? current : "pending"));
    const gen = ++saveGen.current;
    const timer = window.setTimeout(() => {
      if (saveGen.current === gen) void persist();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    flexibleOn,
    persist,
    plan.step,
    plan.tripId,
    plan.state,
    planKey,
    remote,
    status,
    urlTripId,
  ]);

  useEffect(() => {
    const flush = () => {
      if (status !== "authenticated" || authRejectedRef.current || unavailableRef.current) {
        return;
      }
      const current = getActivePlanSnapshot();
      if (!current?.tripId || !isReasonableTripDraft(current)) return;
      if (!detailsReady(current.state, flexibleOn)) return;
      const intent = accountSaveIntent({
        authenticated: true,
        tripId: current.tripId,
        step: current.step,
        hasDestination: Boolean(current.state.destination.trim()),
        guestOrigin: hasGuestOrigin(),
        dismissed: isAccountMergeDismissed(),
      });
      if (intent !== "autosave") return;
      saveGen.current += 1;
      const body = JSON.stringify(tripWriteFromPlan(current, flexibleOn));
      void fetch(`/api/trips/${encodeURIComponent(current.tripId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flexibleOn, status]);

  const saveToAccount = useCallback(() => {
    clearGuestSaveFlags();
    unavailableRef.current = false;
    limitRef.current = false;
    authRejectedRef.current = false;
    setSaveDetail(null);
    void persist();
  }, [persist]);

  const declineMerge = useCallback(() => {
    dismissAccountMerge();
    setMode("declined");
  }, []);

  const retrySave = useCallback(() => {
    unavailableRef.current = false;
    limitRef.current = false;
    authRejectedRef.current = false;
    setSaveDetail(null);
    void persist();
  }, [persist]);

  const restoreGuestBackup = useCallback(() => {
    const backup = readGuestBackup();
    if (!backup) return;
    dismissUrlTrip();
    clearGuestBackup();
    setGuestBackup(null);
    writeActivePlan({ ...backup, tripId: null });
    markGuestOrigin();
    setMode("offer");
  }, [dismissUrlTrip]);

  const rememberGuestDraft = useCallback(() => {
    markGuestOrigin();
  }, []);

  return {
    mode,
    saveDetail,
    remote,
    guestBackup,
    signedIn: status === "authenticated",
    authLoading: status === "loading",
    saveToAccount,
    declineMerge,
    retrySave,
    restoreGuestBackup,
    dismissUrlTrip,
    rememberGuestDraft,
  };
}
