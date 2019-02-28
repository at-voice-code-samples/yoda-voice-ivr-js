# yoda-voice-ivr-js
Voice IVR Demo with get digits



```mermaid
sequenceDiagram
	Request->>+Application: URL-Encoded payload
	Application->>+Redis : Known Number?
	Redis->>+Redis : Fetch / Register
	Redis-->>-Application: Response
	Application->>+Application : Get appropriate menu
	Application->>+Request : XML Payload
```


![Flow Diagram](mermaid-diagram-20190228185651.svg) 
