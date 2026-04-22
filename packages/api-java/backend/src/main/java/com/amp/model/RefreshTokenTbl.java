package com.amp.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_token_tbl")
@Getter
@Setter
public class RefreshTokenTbl {
    @Id
    @Column(name = "token", nullable = false)
    private String token;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "family_id", nullable = false)
    private String familyId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked", nullable = false)
    private boolean revoked;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
