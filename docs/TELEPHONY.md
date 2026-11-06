# TELEPHONY — the phone as another hand (the design)

*How Fanal receives and makes calls, with the same semáforo and the
same constitution. Design first, build when a pilot client pays.
2026-11-06.*

## The principle

The phone is just another HAND — like the browser and the APIs. The
governance does not change: Fanal announces itself (by AUDIO instead of
the badge), consults the constitution and the memory, proposes, and the
human (the caller OR the owner) signs. The bilateral accountability
applies: the diner who reserves over the phone confirms HIS OWN
reservation — the burden rides with the caller.

## The architecture (three layers)

1. **The pipe (SIP/VoIP)** — a real local number (418 for Charlevoix)
   through a SIP trunk: Twilio, Telnyx, VoIP.ms, or the incumbent.
2. **The ears and the mouth (STT + TTS)** — DeepSeek is text-only, so
   the voice layer converts: SenseVoice (local, already in the DSH
   profile) or Whisper for STT; Piper (local) or the OS speech for TTS.
3. **The brain and the organs (ours, unchanged)** — the flash tier with
   the constitution + the memory + the calendar; the Répondant flow
   becomes the Téléphoniste flow; the semáforo grades every action.

## The two scenarios

**The receptionist + foreign client.** Fanal's interpreter mode (10
languages, already built) with a headset: the receptionist speaks, the
client hears the translation, the client's speech comes back as text
and audio — instant interpretation during a live call.

**The diner calls the restaurant.** Fanal answers with the mandatory
announcement: "Vous êtes accueilli par Fanal, l'assistant de [nom] —
je peux réserver immédiatement avec toutes les données à jour, ou un
humain vous répondra dans 15 à 30 minutes." The reservation follows the
constitution (hours, capacity, the minimum price NEVER offered unless
the owner authorized it); the caller confirms — his word is the
signature in the record.

## The honest costs (Québec, CAD, approximate)

| Option | Monthly + per minute | Sovereignty |
|---|---|---|
| Twilio (418 number + voice + STT/TTS) | ~$1.50/mo + ~$0.05-0.10/min | cloud, reliable |
| Telnyx | similar, cheaper | cloud |
| VoIP.ms + SenseVoice local + Piper local | ~$1/mo + $0/min (local compute) | 100% local |
| Asterisk/FreeSWITCH self-hosted | $0/min + your own server | 100% sovereign |

A 3-minute reservation call costs about $0.20-0.40 on the cloud path,
and ZERO on the local path.

## The doctrine notes

- The announcement is mandatory and AUDIBLE (the badge of the voice):
  the caller always knows a machine answers, and the call is recorded
  with the consent embedded in the announcement.
- Charging a card or anything irreversible over the phone = RED: a
  human does it, always.
- The demand-first rule stands: the first integration is built for the
  FIRST pilot client (hotel or restaurant) that pays for it.
