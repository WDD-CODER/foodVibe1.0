path: SAFE
action: Discard — saveShot() is an HttpClient-based service method that completes automatically.
reasoning: The .subscribe() is on a service method (saveShot) that returns an Observable from HttpClient. HTTP observables complete after the response, so no cleanup is needed. Not a violation.
