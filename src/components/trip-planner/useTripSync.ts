"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  backupGuestDraft,
  clearGuestBackup,
  getActivePlanSnapshot,
  readGuestBackup,
  writeActivePlan,
  type StoredPlan,
} from "@/lib/trip-planner-storage";
import {
  validateCategories,
  validateDetails,
} from "@/lib/trip-planner-model";
import {
  isReasonableTripDraft,
  planATripHref,
  storedPlanFromTrip,
  tripWriteFromPlan,
  type TripRecord,
} from "@/lib/trip-record";

const MERGE_FLAG = "fj.plan-a-trip.merge-offer";
const DISMISS_FLAG = "fj.plan-a-trip.merge-dismissed";

export type TripSaveMode =
  | "checking"
  | "local"
  | "offer"
  | "declined"
  | "saving"
  | "saved"
  | "unavailable"
  | "error";

export type RemoteTripState = "idle" | "loading" | "ready" | "missing" | "error";

type Options = {
  plan: StoredPlan;
  flexibleOn: boolean;
  urlTripId: string | null;
};

function detailsReady(state: StoredPlan["state"], flexibleOn: boolean): boolean {
  if (validateCategories(state)) return false;
  return Object.keys(validateDetails(state, flexibleOn)).length === 0;
}

function rememberGuestDraft() {
  try {
    sessionStorage.setItem(MERGE_FLAG, "1");
  } catch {
    /* private mode */
  }
}

function clearMergeFlags() {
  try {
    sessionStorage.removeItem(MERGE_FLAG);
    sessionStorage.removeItem(DISMISS_FLAG);
  } catch {
    /* private mode */
  }
}

/**
 * Guest drafts stay in localStorage. Signed-in readers sync step 4 to
 * Firestore. A draft started while signed out is offered as a merge after login.
 */
export function useTripSync({ plan, flexibleOn, urlTripId }: Options) {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState<TripSaveMode>("checking");
  const [remote, setRemote] = useState<RemoteTripState>(
    urlTripId ? "loading" : "idle",
  );
  const [guestBackup, setGuestBackup] = useState<StoredPlan | null>(null);
  const [mergeReady, setMergeReady] = useState(false);
  const [mergeOffer, setMergeOffer] = useState(false);
  const [mergeDeclined, setMergeDeclined] = useState(false);
  const suppressUrlTrip = useRef<string | null>(null);
  const loadedUrlTrip = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
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
      if (
        plan.step === 4 &&
        plan.state.destination.trim() &&
        !plan.tripId
      ) {
        rememberGuestDraft();
      }
      setMergeReady(true);
      setMergeOffer(false);
      return;
    }
    if (status !== "authenticated") return;

    let offer = false;
    let declined = false;
    try {
      offer = sessionStorage.getItem(MERGE_FLAG) === "1" && !plan.tripId;
      declined = sessionStorage.getItem(DISMISS_FLAG) === "1" && !plan.tripId;
    } catch {
      offer = false;
      declined = false;
    }
    setMergeOffer(offer && plan.step === 4);
    setMergeDeclined(declined && plan.step === 4);
    setMergeReady(true);
  }, [status, plan.step, plan.tripId, plan.state.destination]);

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
    clearMergeFlags();
    setMergeOffer(false);
    setMergeDeclined(false);
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
        const current = getActivePlanSnapshot();
        if (
          current &&
          !current.tripId &&
          current.step === 4 &&
          current.state.destination.trim()
        ) {
          backupGuestDraft(current);
          setGuestBackup({ ...current });
        }
        loadedUrlTrip.current = urlTripId;
        writeActivePlan(storedPlanFromTrip(data.trip));
        clearMergeFlags();
        setMergeOffer(false);
        setMergeDeclined(false);
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
    if (status !== "authenticated") return;
    const current = getActivePlanSnapshot();
    if (!current || !isReasonableTripDraft(current)) return;
    if (!detailsReady(current.state, flexibleOn)) return;
    if (urlTripId && remote !== "ready" && current.tripId !== urlTripId) return;

    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    setMode("saving");
    try {
      const body = JSON.stringify(tripWriteFromPlan(current, flexibleOn));
      const id = tripIdRef.current;
      const res = await fetch(id ? `/api/trips/${encodeURIComponent(id)}` : "/api/trips", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.status === 503) {
        setMode("unavailable");
        return;
      }
      if (res.status === 401) {
        setMode("local");
        return;
      }
      if (!res.ok) {
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
      clearMergeFlags();
      setMergeOffer(false);
      setMergeDeclined(false);
      setMode("saved");
    } catch {
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
    tripId: plan.tripId,
  });

  useEffect(() => {
    if (status === "loading" || !mergeReady) {
      setMode("checking");
      return;
    }
    if (status !== "authenticated") {
      setMode("local");
      return;
    }
    if (plan.step !== 4 || !isReasonableTripDraft(plan)) return;
    if (urlTripId && remote !== "ready") return;
    if (!detailsReady(plan.state, flexibleOn)) return;

    if (!plan.tripId && mergeOffer) {
      setMode("offer");
      return;
    }
    if (!plan.tripId && mergeDeclined) {
      setMode("declined");
      return;
    }

    const timer = window.setTimeout(() => {
      void persist();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    flexibleOn,
    mergeDeclined,
    mergeOffer,
    mergeReady,
    persist,
    plan.step,
    plan.tripId,
    plan.state,
    planKey,
    remote,
    status,
    urlTripId,
  ]);

  const saveToAccount = useCallback(() => {
    clearMergeFlags();
    setMergeOffer(false);
    setMergeDeclined(false);
    void persist();
  }, [persist]);

  const declineMerge = useCallback(() => {
    try {
      sessionStorage.removeItem(MERGE_FLAG);
      sessionStorage.setItem(DISMISS_FLAG, "1");
    } catch {
      /* private mode */
    }
    setMergeOffer(false);
    setMergeDeclined(true);
    setMode("declined");
  }, []);

  const restoreGuestBackup = useCallback(() => {
    const backup = readGuestBackup();
    if (!backup) return;
    dismissUrlTrip();
    clearGuestBackup();
    setGuestBackup(null);
    writeActivePlan({ ...backup, tripId: null });
    rememberGuestDraft();
    try {
      sessionStorage.removeItem(DISMISS_FLAG);
    } catch {
      /* private mode */
    }
    setMergeDeclined(false);
    setMergeOffer(true);
  }, [dismissUrlTrip]);

  return {
    mode,
    remote,
    guestBackup,
    signedIn: status === "authenticated",
    authLoading: status === "loading",
    saveToAccount,
    declineMerge,
    restoreGuestBackup,
    dismissUrlTrip,
    rememberGuestDraft,
  };
}
