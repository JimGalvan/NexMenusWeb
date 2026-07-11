import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DraftClaimResult, DraftClaimStatus, DraftPreview } from '../models/draft.model';

/**
 * Claim/preview endpoints for anonymous menu drafts created through ChatGPT.
 * Both are token-addressed: the token IS the credential, so these URLs must
 * never be logged or sent to analytics.
 */
@Injectable({ providedIn: 'root' })
export class DraftService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/api/${environment.apiVersion}`;

  getClaimStatus(claimToken: string): Observable<DraftClaimStatus> {
    return this.http.get<DraftClaimStatus>(`${this.api}/draft-claims/${encodeURIComponent(claimToken)}`);
  }

  /** Requires an authenticated session; converts the draft into a real menu. */
  claim(claimToken: string): Observable<DraftClaimResult> {
    return this.http.post<DraftClaimResult>(`${this.api}/draft-claims/${encodeURIComponent(claimToken)}`, {});
  }

  getPreview(previewToken: string): Observable<DraftPreview> {
    return this.http.get<DraftPreview>(`${this.api}/draft-previews/${encodeURIComponent(previewToken)}`);
  }
}
