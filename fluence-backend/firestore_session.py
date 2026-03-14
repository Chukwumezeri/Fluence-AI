import time, copy, uuid, logging
from typing import Optional, Any
from google.cloud.firestore_v1.async_client import AsyncClient
from google.adk.sessions import BaseSessionService, _session_util, State
from google.adk.sessions.base_session_service import GetSessionConfig, ListSessionsResponse
from google.adk.sessions.session import Session
from google.adk.events.event import Event
from google.adk.errors.already_exists_error import AlreadyExistsError

log = logging.getLogger(__name__)

class FirestoreSessionService(BaseSessionService):
    """
    Persists ADK sessions to Google Cloud Firestore.
    """
    def __init__(self, db: AsyncClient, collection_name: str = 'adk_sessions'):
        self.db = db
        self.collection_name = collection_name
        
    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: Optional[GetSessionConfig] = None,
    ) -> Optional[Session]:
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return None
            
        data = doc.to_dict()
        if data.get('app_name') != app_name or data.get('user_id') != user_id:
            return None
            
        try:
            session = Session.model_validate(data['session_data'])
        except Exception as e:
            log.error(f'Failed to deserialize session {session_id}: {e}')
            return None

        # Apply config filters
        if config:
            if config.num_recent_events:
                session.events = session.events[-config.num_recent_events:]
            if config.after_timestamp:
                i = len(session.events) - 1
                while i >= 0:
                    if session.events[i].timestamp < config.after_timestamp:
                        break
                    i -= 1
                if i >= 0:
                    session.events = session.events[i + 1:]
                    
        return session

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        sid = session_id.strip() if session_id and session_id.strip() else str(uuid.uuid4())
        
        # Check if exists
        existing = await self.get_session(app_name=app_name, user_id=user_id, session_id=sid)
        if existing:
            raise AlreadyExistsError(f'Session with id {sid} already exists.')
            
        session_state = state or {}
        session = Session(
            app_name=app_name,
            user_id=user_id,
            id=sid,
            state=session_state,
            last_update_time=time.time(),
        )
        
        doc_ref = self.db.collection(self.collection_name).document(sid)
        await doc_ref.set({
            'app_name': app_name,
            'user_id': user_id,
            'session_id': sid,
            'updated_at': time.time(),
            'session_data': session.model_dump(mode='json')
        })
        
        return session

    async def append_event(self, session: Session, event: Event) -> Event:
        if event.partial:
            return event
            
        # Update in-memory session object
        await super().append_event(session=session, event=event)
        session.last_update_time = event.timestamp
        
        # Fetch current from Firestore and update
        doc_ref = self.db.collection(self.collection_name).document(session.id)
        doc = await doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            try:
                storage_session = Session.model_validate(data['session_data'])
                storage_session.events.append(event)
                storage_session.last_update_time = event.timestamp
                
                # Update state if delta exists
                if event.actions and event.actions.state_delta:
                    state_deltas = _session_util.extract_state_delta(event.actions.state_delta)
                    if state_deltas.get('session'):
                        storage_session.state.update(state_deltas['session'])
                
                await doc_ref.update({
                    'updated_at': event.timestamp,
                    'session_data': storage_session.model_dump(mode='json')
                })
            except Exception as e:
                log.error(f'Failed to append event to Firestore session {session.id}: {e}')
                
        return event

    async def list_sessions(
        self, *, app_name: str, user_id: Optional[str] = None
    ) -> ListSessionsResponse:
        query = self.db.collection(self.collection_name).where('app_name', '==', app_name)
        if user_id:
            query = query.where('user_id', '==', user_id)
            
        docs = await query.get()
        sessions_without_events = []
        
        for doc in docs:
            data = doc.to_dict()
            try:
                session = Session.model_validate(data['session_data'])
                session.events = [] # Emulate in-memory behavior of stripping events for list
                sessions_without_events.append(session)
            except Exception as e:
                log.error(f"Failed to load session {data.get('session_id')} in list: {e}")
                
        return ListSessionsResponse(sessions=sessions_without_events)

    async def delete_session(
        self, *, app_name: str, user_id: str, session_id: str
    ) -> None:
        doc_ref = self.db.collection(self.collection_name).document(session_id)
        doc = await doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            if data.get('app_name') == app_name and data.get('user_id') == user_id:
                await doc_ref.delete()

    # The synchronous 'impl' methods (if ever called by the base class internall)
    def _create_session_impl(self, **kwargs): raise NotImplementedError("Use async method")
    def _get_session_impl(self, **kwargs): raise NotImplementedError("Use async method")
    def _list_sessions_impl(self, **kwargs): raise NotImplementedError("Use async method")
    def _delete_session_impl(self, **kwargs): raise NotImplementedError("Use async method")
