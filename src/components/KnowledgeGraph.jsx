import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SANS_CLUBS, KEYWORD_CATEGORIES } from '../data/sansData';
import ClubIcon from './ClubIcon';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Users,
  Network,
  GitCommitHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';

function getKeywordColor(keyword) {
  for (const cat of KEYWORD_CATEGORIES) {
    if (cat.keywords.includes(keyword)) {
      return { color: cat.color, bg: cat.bg, title: cat.title };
    }
  }
  return { color: '#0D9488', bg: '#F0FDFA', title: '공감 키워드' };
}

/**
 * Dynamically builds nodes and edges based on the current focus:
 * - { type: 'ALL' }: SANS at center -> 16 Clubs -> All Members
 * - { type: 'MEMBER', id: memberName }: Selected Person at center ->
 *     Submode 'HUB': Person -> (My Clubs + My Team + My Keywords) -> Connected Members
 *     Submode 'DIRECT': Person -> Directly connected Members with shared badges on lines
 * - { type: 'CLUB', id: clubName }: Selected Club at center -> Club Members -> (Their Teams, Other Clubs, Shared Keywords)
 * - { type: 'TEAM', id: teamName }: Selected Team (1조~20조) at center -> Team Members -> (Their Clubs & Keywords)
 * - { type: 'KEYWORD', id: keyword }: Selected Keyword at center -> Members sharing that keyword -> Their Clubs & Teams
 */
function buildGraphLayout(members, focus, personSubMode = 'HUB', showUnconnectedInAll = true) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  const addNode = (node) => {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
      nodes.push(node);
    }
    return nodeMap.get(node.id);
  };

  const addEdge = (edge) => {
    const id = `${edge.source}__${edge.target}__${edge.kind || ''}`;
    if (!edges.some((e) => e.id === id)) {
      edges.push({ ...edge, id });
    }
  };

  const clubByName = new Map(SANS_CLUBS.map((c) => [c.name, c]));

  // =========================================================================
  // 1. FOCUS: SPECIFIC MEMBER (특정 이름 선택 시 — 가독성 최우선!)
  // =========================================================================
  if (focus.type === 'MEMBER') {
    const targetMember = members.find((m) => m.name === focus.id);
    if (!targetMember) {
      return buildGraphLayout(members, { type: 'ALL' }, personSubMode, showUnconnectedInAll);
    }

    // Center Hero Node: The Selected Person
    addNode({
      id: `member:${targetMember.name}`,
      key: targetMember.name,
      nodeType: 'MEMBER_HERO',
      label: targetMember.name,
      subLabel: `${targetMember.team} · 클럽 ${targetMember.clubs.length}개`,
      member: targetMember,
      x: 0,
      y: 0,
      radius: 48,
      color: '#4F46E5',
      bg: '#EEF2FF'
    });

    // Find all colleagues connected to targetMember via Club, Team, or Keyword
    const connectedColleagues = [];
    for (const m of members) {
      if (m.name === targetMember.name) continue;
      const sharedClubs = m.clubs.filter((c) => targetMember.clubs.includes(c));
      const sameTeam = m.team && m.team === targetMember.team ? m.team : null;
      const sharedKeywords = m.keywords.filter((k) => targetMember.keywords.includes(k));

      if (sharedClubs.length > 0 || sameTeam || sharedKeywords.length > 0) {
        connectedColleagues.push({
          member: m,
          sharedClubs,
          sameTeam,
          sharedKeywords,
          totalScore: sharedClubs.length * 3 + (sameTeam ? 3 : 0) + sharedKeywords.length * 2
        });
      }
    }

    if (personSubMode === 'DIRECT') {
      // 1:1 Direct Connection Lines Mode:
      // Target Person at (0,0) -> Connected Colleagues in a clean circle around them
      const count = connectedColleagues.length;
      const ringRadius = Math.max(290, (count * 115) / (2 * Math.PI));

      connectedColleagues.forEach((item, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
        const m = item.member;
        const primaryClub = clubByName.get(item.sharedClubs[0] || m.clubs[0]);
        const lineColor = primaryClub
          ? primaryClub.color
          : item.sameTeam
          ? '#4F46E5'
          : '#059669';

        const badges = [
          ...item.sharedClubs.map((c) => ({
            text: clubByName.get(c)?.shortName || c,
            color: clubByName.get(c)?.color || '#4F46E5',
            bg: clubByName.get(c)?.bgLight || '#EEF2FF'
          })),
          ...(item.sameTeam
            ? [{ text: item.sameTeam, color: '#4338CA', bg: '#E0E7FF' }]
            : []),
          ...item.sharedKeywords.map((k) => ({
            text: k,
            color: '#047857',
            bg: '#D1FAE5'
          }))
        ];

        const nodeId = `member:${m.name}`;
        addNode({
          id: nodeId,
          key: m.name,
          nodeType: 'MEMBER',
          label: m.name,
          subLabel: m.team,
          member: m,
          sharedBadges: badges,
          x: Math.cos(angle) * ringRadius,
          y: Math.sin(angle) * ringRadius,
          radius: 30,
          color: lineColor,
          bg: '#FFFFFF'
        });

        addEdge({
          source: `member:${targetMember.name}`,
          target: nodeId,
          kind: 'DIRECT_BRIDGE',
          color: lineColor,
          width: Math.min(4.5, 2 + item.totalScore * 0.35),
          label: badges.slice(0, 2).map((b) => b.text).join(' · '),
          extraCount: Math.max(0, badges.length - 2),
          isPrimary: true
        });
      });

      return { nodes, edges };
    }

    // Submode 'HUB': Knowledge Graph Multi-Hop View
    // Ring 1: Target Member's Clubs + Team + Keywords
    const ring1Hubs = [];

    for (const cName of targetMember.clubs) {
      const cObj = clubByName.get(cName);
      ring1Hubs.push({
        id: `club:${cName}`,
        key: cName,
        nodeType: 'CLUB',
        label: cObj?.shortName ? `${cObj.shortName} 클럽` : cName,
        fullName: cName,
        subLabel: '소속 클럽',
        club: cObj,
        color: cObj?.color || '#6366F1',
        bg: cObj?.bgLight || '#EEF2FF',
        hubKind: 'CLUB'
      });
    }

    if (targetMember.team) {
      ring1Hubs.push({
        id: `team:${targetMember.team}`,
        key: targetMember.team,
        nodeType: 'TEAM',
        label: `산스 ${targetMember.team}`,
        subLabel: '소속 조',
        color: '#4338CA',
        bg: '#E0E7FF',
        hubKind: 'TEAM'
      });
    }

    for (const kw of targetMember.keywords) {
      const kwTheme = getKeywordColor(kw);
      ring1Hubs.push({
        id: `keyword:${kw}`,
        key: kw,
        nodeType: 'KEYWORD',
        label: kw,
        subLabel: '공감 키워드',
        color: kwTheme.color,
        bg: kwTheme.bg,
        hubKind: 'KEYWORD'
      });
    }

    const r1Count = ring1Hubs.length;
    const r1Radius = Math.max(210, (r1Count * 110) / (2 * Math.PI));

    ring1Hubs.forEach((hub, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const hx = Math.cos(angle) * r1Radius;
      const hy = Math.sin(angle) * r1Radius;

      addNode({
        ...hub,
        x: hx,
        y: hy,
        angle,
        radius: hub.nodeType === 'CLUB' ? 34 : 30
      });

      addEdge({
        source: `member:${targetMember.name}`,
        target: hub.id,
        kind: `HERO_TO_${hub.hubKind}`,
        color: hub.color,
        width: 3.2,
        label: hub.subLabel,
        isPrimary: true
      });
    });

    // Ring 2: Connected Colleagues placed near the average angle of the Ring 1 hubs they connect to!
    const scoredWithAngle = connectedColleagues.map((item) => {
      const matchingHubs = ring1Hubs.filter(
        (h) =>
          (h.hubKind === 'CLUB' && item.sharedClubs.includes(h.key)) ||
          (h.hubKind === 'TEAM' && item.sameTeam === h.key) ||
          (h.hubKind === 'KEYWORD' && item.sharedKeywords.includes(h.key))
      );

      // Compute circular mean of angles
      let sinSum = 0;
      let cosSum = 0;
      matchingHubs.forEach((mh) => {
        const node = nodeMap.get(mh.id);
        if (node) {
          const weight = mh.hubKind === 'CLUB' ? 2.0 : mh.hubKind === 'TEAM' ? 1.8 : 1.0;
          sinSum += Math.sin(node.angle) * weight;
          cosSum += Math.cos(node.angle) * weight;
        }
      });
      const preferredAngle = Math.atan2(sinSum, cosSum);
      return { ...item, matchingHubs, preferredAngle };
    });

    // Sort by preferredAngle so outer ring nodes never cross unnecessarily
    scoredWithAngle.sort((a, b) => a.preferredAngle - b.preferredAngle);

    const r2Count = scoredWithAngle.length;
    const r2Radius = Math.max(430, r1Radius + 210, (r2Count * 105) / (2 * Math.PI));

    scoredWithAngle.forEach((item, idx) => {
      // Blend preferred angle with even spacing so no two outer nodes collide
      const evenAngle = (2 * Math.PI * idx) / Math.max(1, r2Count) - Math.PI;
      const m = item.member;
      const mx = Math.cos(evenAngle) * r2Radius;
      const my = Math.sin(evenAngle) * r2Radius;

      const badges = [
        ...item.sharedClubs.map((c) => ({
          text: clubByName.get(c)?.shortName || c,
          color: clubByName.get(c)?.color || '#4F46E5',
          bg: clubByName.get(c)?.bgLight || '#EEF2FF'
        })),
        ...(item.sameTeam
          ? [{ text: item.sameTeam, color: '#4338CA', bg: '#E0E7FF' }]
          : []),
        ...item.sharedKeywords.map((k) => ({
          text: k,
          color: '#047857',
          bg: '#D1FAE5'
        }))
      ];

      const primaryHub = item.matchingHubs[0];
      const memberNodeId = `member:${m.name}`;

      addNode({
        id: memberNodeId,
        key: m.name,
        nodeType: 'MEMBER',
        label: m.name,
        subLabel: m.team,
        member: m,
        sharedBadges: badges,
        x: mx,
        y: my,
        radius: 28,
        color: primaryHub?.color || '#4F46E5',
        bg: '#FFFFFF'
      });

      item.matchingHubs.forEach((mh) => {
        addEdge({
          source: mh.id,
          target: memberNodeId,
          kind: `${mh.hubKind}_TO_MEMBER`,
          color: mh.color,
          width: mh.hubKind === 'CLUB' ? 2.4 : 2.0,
          isPrimary: false
        });
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 2. FOCUS: SPECIFIC CLUB (클럽 선택 시 — 해당 클럽 중심 지식그래프)
  // =========================================================================
  if (focus.type === 'CLUB') {
    const targetClub = SANS_CLUBS.find((c) => c.name === focus.id) || SANS_CLUBS[0];
    const clubMembers = members.filter((m) => m.clubs.includes(targetClub.name));

    // Center Hero Node: Selected Club
    addNode({
      id: `club:${targetClub.name}`,
      key: targetClub.name,
      nodeType: 'CLUB_HERO',
      label: targetClub.name,
      subLabel: `소속 멤버 ${clubMembers.length}명`,
      club: targetClub,
      x: 0,
      y: 0,
      radius: 52,
      color: targetClub.color,
      bg: targetClub.bgLight
    });

    // Ring 1: Members of this Club
    const r1Count = clubMembers.length;
    const r1Radius = Math.max(220, (r1Count * 115) / (2 * Math.PI));

    clubMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mx = Math.cos(angle) * r1Radius;
      const my = Math.sin(angle) * r1Radius;
      const mNodeId = `member:${m.name}`;

      const badges = [
        { text: m.team, color: '#4338CA', bg: '#E0E7FF' },
        ...m.keywords.slice(0, 2).map((k) => ({
          text: k,
          color: '#047857',
          bg: '#D1FAE5'
        }))
      ];

      addNode({
        id: mNodeId,
        key: m.name,
        nodeType: 'MEMBER',
        label: m.name,
        subLabel: m.team,
        member: m,
        sharedBadges: badges,
        x: mx,
        y: my,
        angle,
        radius: 30,
        color: targetClub.color,
        bg: '#FFFFFF'
      });

      addEdge({
        source: `club:${targetClub.name}`,
        target: mNodeId,
        kind: 'CLUB_TO_MEMBER',
        color: targetClub.color,
        width: 3.2,
        label: m.team,
        isPrimary: true
      });
    });

    // Also connect club members directly if they share keywords or same team
    for (let i = 0; i < clubMembers.length; i++) {
      for (let j = i + 1; j < clubMembers.length; j++) {
        const m1 = clubMembers[i];
        const m2 = clubMembers[j];
        const sharedKw = m1.keywords.filter((k) => m2.keywords.includes(k));
        const sameTeam = m1.team === m2.team ? m1.team : null;
        if (sharedKw.length > 0 || sameTeam) {
          addEdge({
            source: `member:${m1.name}`,
            target: `member:${m2.name}`,
            kind: 'PEER_RESONANCE',
            color: sameTeam ? '#4F46E5' : '#10B981',
            width: 1.8,
            dashed: true,
            label: sameTeam || sharedKw[0]
          });
        }
      }
    }

    // Ring 2: Connected Other Clubs, Teams, and Shared Keywords of these members
    const outerNodes = [];

    // 2a. Other clubs these members also belong to (Cross-club bridges!)
    const otherClubMap = new Map();
    clubMembers.forEach((m) => {
      m.clubs.forEach((cName) => {
        if (cName === targetClub.name) return;
        if (!otherClubMap.has(cName)) otherClubMap.set(cName, []);
        otherClubMap.get(cName).push(m);
      });
    });

    for (const [cName, bridgeMembers] of otherClubMap.entries()) {
      const cObj = clubByName.get(cName);
      outerNodes.push({
        id: `club:${cName}`,
        key: cName,
        nodeType: 'CLUB',
        label: cObj?.shortName ? `${cObj.shortName} 클럽` : cName,
        fullName: cName,
        subLabel: `교차 멤버 ${bridgeMembers.length}명`,
        club: cObj,
        color: cObj?.color || '#6366F1',
        bg: cObj?.bgLight || '#EEF2FF',
        bridgeMembers
      });
    }

    // 2b. Teams of these club members
    const teamMap = new Map();
    clubMembers.forEach((m) => {
      if (!m.team) return;
      if (!teamMap.has(m.team)) teamMap.set(m.team, []);
      teamMap.get(m.team).push(m);
    });

    for (const [tName, tMembers] of teamMap.entries()) {
      outerNodes.push({
        id: `team:${tName}`,
        key: tName,
        nodeType: 'TEAM',
        label: `산스 ${tName}`,
        subLabel: `${targetClub.shortName} 소속 ${tMembers.length}명`,
        color: '#4338CA',
        bg: '#E0E7FF',
        bridgeMembers: tMembers
      });
    }

    // 2c. Keywords selected by these club members
    const kwMap = new Map();
    clubMembers.forEach((m) => {
      m.keywords.forEach((kw) => {
        if (!kwMap.has(kw)) kwMap.set(kw, []);
        kwMap.get(kw).push(m);
      });
    });

    for (const [kw, kMembers] of kwMap.entries()) {
      const kwTheme = getKeywordColor(kw);
      outerNodes.push({
        id: `keyword:${kw}`,
        key: kw,
        nodeType: 'KEYWORD',
        label: kw,
        subLabel: `${kMembers.length}명 공감`,
        color: kwTheme.color,
        bg: kwTheme.bg,
        bridgeMembers: kMembers
      });
    }

    // Sort outer nodes by average angle of their bridgeMembers
    outerNodes.forEach((on) => {
      let sinSum = 0;
      let cosSum = 0;
      on.bridgeMembers.forEach((bm) => {
        const mNode = nodeMap.get(`member:${bm.name}`);
        if (mNode) {
          sinSum += Math.sin(mNode.angle);
          cosSum += Math.cos(mNode.angle);
        }
      });
      on.prefAngle = Math.atan2(sinSum, cosSum);
    });
    outerNodes.sort((a, b) => a.prefAngle - b.prefAngle);

    const r2Count = outerNodes.length;
    const r2Radius = Math.max(430, r1Radius + 195, (r2Count * 98) / (2 * Math.PI));

    outerNodes.forEach((on, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r2Count) - Math.PI;
      addNode({
        ...on,
        x: Math.cos(angle) * r2Radius,
        y: Math.sin(angle) * r2Radius,
        radius: on.nodeType === 'CLUB' ? 32 : 26
      });

      on.bridgeMembers.forEach((bm) => {
        addEdge({
          source: `member:${bm.name}`,
          target: on.id,
          kind: 'MEMBER_TO_OUTER',
          color: on.color,
          width: on.nodeType === 'CLUB' ? 2.4 : 1.8
        });
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 3. FOCUS: SPECIFIC TEAM (1조~20조 선택 시 — 조 중심 지식그래프)
  // =========================================================================
  if (focus.type === 'TEAM') {
    const teamName = focus.id;
    const teamMembers = members.filter((m) => m.team === teamName);

    addNode({
      id: `team:${teamName}`,
      key: teamName,
      nodeType: 'TEAM_HERO',
      label: `산스 ${teamName}`,
      subLabel: `소속 구성원 ${teamMembers.length}명`,
      x: 0,
      y: 0,
      radius: 50,
      color: '#4338CA',
      bg: '#E0E7FF'
    });

    const r1Count = teamMembers.length;
    const r1Radius = Math.max(210, (r1Count * 115) / (2 * Math.PI));

    teamMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;
      const badges = m.clubs.map((c) => ({
        text: clubByName.get(c)?.shortName || c,
        color: clubByName.get(c)?.color || '#4F46E5',
        bg: clubByName.get(c)?.bgLight || '#EEF2FF'
      }));

      addNode({
        id: mNodeId,
        key: m.name,
        nodeType: 'MEMBER',
        label: m.name,
        subLabel: `클럽 ${m.clubs.length}개 활동`,
        member: m,
        sharedBadges: badges,
        x: Math.cos(angle) * r1Radius,
        y: Math.sin(angle) * r1Radius,
        angle,
        radius: 30,
        color: '#4338CA',
        bg: '#FFFFFF'
      });

      addEdge({
        source: `team:${teamName}`,
        target: mNodeId,
        kind: 'TEAM_TO_MEMBER',
        color: '#4338CA',
        width: 3.2,
        isPrimary: true
      });
    });

    // Ring 2: Clubs and Keywords of these team members
    const outerHubs = [];
    const clubMap = new Map();
    const kwMap = new Map();

    teamMembers.forEach((m) => {
      m.clubs.forEach((cName) => {
        if (!clubMap.has(cName)) clubMap.set(cName, []);
        clubMap.get(cName).push(m);
      });
      m.keywords.forEach((kw) => {
        if (!kwMap.has(kw)) kwMap.set(kw, []);
        kwMap.get(kw).push(m);
      });
    });

    for (const [cName, cMembers] of clubMap.entries()) {
      const cObj = clubByName.get(cName);
      outerHubs.push({
        id: `club:${cName}`,
        key: cName,
        nodeType: 'CLUB',
        label: cObj?.shortName ? `${cObj.shortName} 클럽` : cName,
        fullName: cName,
        subLabel: `${teamName}에서 ${cMembers.length}명 참여`,
        club: cObj,
        color: cObj?.color || '#6366F1',
        bg: cObj?.bgLight || '#EEF2FF',
        bridgeMembers: cMembers
      });
    }

    for (const [kw, kMembers] of kwMap.entries()) {
      const kwTheme = getKeywordColor(kw);
      outerHubs.push({
        id: `keyword:${kw}`,
        key: kw,
        nodeType: 'KEYWORD',
        label: kw,
        subLabel: `${kMembers.length}명 선택`,
        color: kwTheme.color,
        bg: kwTheme.bg,
        bridgeMembers: kMembers
      });
    }

    const r2Count = outerHubs.length;
    const r2Radius = Math.max(410, r1Radius + 190, (r2Count * 100) / (2 * Math.PI));

    outerHubs.forEach((oh, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r2Count) - Math.PI / 2;
      addNode({
        ...oh,
        x: Math.cos(angle) * r2Radius,
        y: Math.sin(angle) * r2Radius,
        radius: oh.nodeType === 'CLUB' ? 32 : 26
      });

      oh.bridgeMembers.forEach((bm) => {
        addEdge({
          source: `member:${bm.name}`,
          target: oh.id,
          kind: 'MEMBER_TO_HUB',
          color: oh.color,
          width: oh.nodeType === 'CLUB' ? 2.4 : 1.8
        });
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 4. FOCUS: SPECIFIC KEYWORD (키워드 선택 시)
  // =========================================================================
  if (focus.type === 'KEYWORD') {
    const keyword = focus.id;
    const kwTheme = getKeywordColor(keyword);
    const kwMembers = members.filter((m) => m.keywords.includes(keyword));

    addNode({
      id: `keyword:${keyword}`,
      key: keyword,
      nodeType: 'KEYWORD_HERO',
      label: keyword,
      subLabel: `공감 구성원 ${kwMembers.length}명`,
      x: 0,
      y: 0,
      radius: 48,
      color: kwTheme.color,
      bg: kwTheme.bg
    });

    const r1Count = kwMembers.length;
    const r1Radius = Math.max(220, (r1Count * 115) / (2 * Math.PI));

    kwMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;
      const badges = [
        { text: m.team, color: '#4338CA', bg: '#E0E7FF' },
        ...m.clubs.map((c) => ({
          text: clubByName.get(c)?.shortName || c,
          color: clubByName.get(c)?.color || '#4F46E5',
          bg: clubByName.get(c)?.bgLight || '#EEF2FF'
        }))
      ];

      addNode({
        id: mNodeId,
        key: m.name,
        nodeType: 'MEMBER',
        label: m.name,
        subLabel: m.team,
        member: m,
        sharedBadges: badges,
        x: Math.cos(angle) * r1Radius,
        y: Math.sin(angle) * r1Radius,
        radius: 30,
        color: kwTheme.color,
        bg: '#FFFFFF'
      });

      addEdge({
        source: `keyword:${keyword}`,
        target: mNodeId,
        kind: 'KEYWORD_TO_MEMBER',
        color: kwTheme.color,
        width: 3.0,
        isPrimary: true
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 5. DEFAULT FOCUS: ALL SANS (산스 전체 은하수 지식그래프)
  // =========================================================================
  addNode({
    id: 'core:SANS',
    key: 'SANS',
    nodeType: 'SANS_CORE',
    label: '산스 (SANS)',
    subLabel: `16개 클럽 · ${members.length}명 연결`,
    x: 0,
    y: 0,
    radius: 54,
    color: '#312E81',
    bg: '#E0E7FF'
  });

  // Ring 1: 16 SANS Clubs
  const clubRadius = 265;
  const clubAngles = new Map();

  SANS_CLUBS.forEach((club, idx) => {
    const angle = (2 * Math.PI * idx) / SANS_CLUBS.length - Math.PI / 2;
    clubAngles.set(club.name, angle);
    const clubMembersCount = members.filter((m) => m.clubs.includes(club.name)).length;

    const clubNodeId = `club:${club.name}`;
    addNode({
      id: clubNodeId,
      key: club.name,
      nodeType: 'CLUB',
      label: club.shortName + ' 클럽',
      fullName: club.name,
      subLabel: `${clubMembersCount}명`,
      club,
      x: Math.cos(angle) * clubRadius,
      y: Math.sin(angle) * clubRadius,
      angle,
      radius: 33,
      color: club.color,
      bg: club.bgLight
    });

    addEdge({
      source: 'core:SANS',
      target: clubNodeId,
      kind: 'SANS_TO_CLUB',
      color: '#CBD5E1',
      width: 1.8
    });
  });

  // Ring 2: All Members arranged smoothly by their clubs' angular position
  const membersWithAngle = members.map((m, idx) => {
    let sinSum = 0;
    let cosSum = 0;
    m.clubs.forEach((cName) => {
      if (clubAngles.has(cName)) {
        const a = clubAngles.get(cName);
        sinSum += Math.sin(a);
        cosSum += Math.cos(a);
      }
    });
    const prefAngle =
      m.clubs.length > 0
        ? Math.atan2(sinSum, cosSum)
        : (2 * Math.PI * idx) / Math.max(1, members.length);
    return { member: m, prefAngle };
  });

  membersWithAngle.sort((a, b) => a.prefAngle - b.prefAngle);

  const mCount = membersWithAngle.length;
  const memberRadius = Math.max(495, (mCount * 86) / (2 * Math.PI));

  membersWithAngle.forEach(({ member: m }, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, mCount) - Math.PI;
    const mNodeId = `member:${m.name}`;
    const primaryClub = clubByName.get(m.clubs[0]);

    const badges = [
      { text: m.team, color: '#4338CA', bg: '#E0E7FF' },
      ...m.clubs.slice(0, 2).map((c) => ({
        text: clubByName.get(c)?.shortName || c,
        color: clubByName.get(c)?.color || '#4F46E5',
        bg: clubByName.get(c)?.bgLight || '#EEF2FF'
      }))
    ];

    addNode({
      id: mNodeId,
      key: m.name,
      nodeType: 'MEMBER',
      label: m.name,
      subLabel: m.team,
      member: m,
      sharedBadges: badges,
      x: Math.cos(angle) * memberRadius,
      y: Math.sin(angle) * memberRadius,
      radius: m.clubs.length > 1 ? 28 : 25,
      color: primaryClub?.color || '#4F46E5',
      bg: '#FFFFFF'
    });

    if (m.clubs.length > 0) {
      m.clubs.forEach((cName) => {
        const cObj = clubByName.get(cName);
        if (cObj) {
          addEdge({
            source: `club:${cName}`,
            target: mNodeId,
            kind: 'CLUB_TO_MEMBER',
            color: cObj.color,
            width: m.clubs.length > 1 ? 2.4 : 1.9
          });
        }
      });
    } else {
      addEdge({
        source: 'core:SANS',
        target: mNodeId,
        kind: 'SANS_TO_MEMBER',
        color: '#94A3B8',
        width: 1.5
      });
    }
  });

  return { nodes, edges };
}

export default function KnowledgeGraph({
  members,
  focus,
  onSelectFocus,
  personSubMode,
  onChangePersonSubMode
}) {
  const svgRef = useRef(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [dimUnconnected, setDimUnconnected] = useState(true);

  // Camera Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.85 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Node custom drag offset map
  const [dragOffsets, setDragOffsets] = useState({});
  const draggingNodeRef = useRef(null);

  const { nodes, edges } = useMemo(
    () => buildGraphLayout(members, focus, personSubMode),
    [members, focus, personSubMode]
  );

  // Reset custom drag offsets and auto-fit camera when focus changes
  useEffect(() => {
    setDragOffsets({});
    setHoveredNodeId(null);
    if (focus.type === 'ALL') {
      setTransform({ x: 0, y: 0, k: 0.72 });
    } else if (focus.type === 'MEMBER' && personSubMode === 'DIRECT') {
      setTransform({ x: 0, y: 0, k: 0.92 });
    } else {
      setTransform({ x: 0, y: 0, k: 0.82 });
    }
  }, [focus.type, focus.id, personSubMode]);

  const nodesWithDrag = useMemo(() => {
    return nodes.map((n) => {
      const off = dragOffsets[n.id];
      return off ? { ...n, x: n.x + off.dx, y: n.y + off.dy } : n;
    });
  }, [nodes, dragOffsets]);

  const nodeById = useMemo(() => {
    const map = new Map();
    nodesWithDrag.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodesWithDrag]);

  // Compute adjacency set for hover highlighting
  const activeConnectedSet = useMemo(() => {
    if (!hoveredNodeId) return null;
    const set = new Set([hoveredNodeId]);
    edges.forEach((e) => {
      if (e.source === hoveredNodeId) set.add(e.target);
      if (e.target === hoveredNodeId) set.add(e.source);
    });
    return set;
  }, [hoveredNodeId, edges]);

  // Mouse / Touch handlers for smooth Pan & Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => ({
      ...prev,
      k: Math.min(2.4, Math.max(0.32, prev.k * factor))
    }));
  };

  const handlePointerDownCanvas = (e) => {
    if (draggingNodeRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y
    };
  };

  const handlePointerMoveCanvas = (e) => {
    if (draggingNodeRef.current) {
      const { id, startX, startY, origDx, origDy } = draggingNodeRef.current;
      const dx = (e.clientX - startX) / transform.k;
      const dy = (e.clientY - startY) / transform.k;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        draggingNodeRef.current.moved = true;
      }
      setDragOffsets((prev) => ({
        ...prev,
        [id]: { dx: origDx + dx, dy: origDy + dy }
      }));
      return;
    }

    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setTransform((prev) => ({
      ...prev,
      x: panStartRef.current.tx + dx,
      y: panStartRef.current.ty + dy
    }));
  };

  const handlePointerUpCanvas = () => {
    isPanningRef.current = false;
    draggingNodeRef.current = null;
  };

  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();
    const existing = dragOffsets[node.id] || { dx: 0, dy: 0 };
    draggingNodeRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origDx: existing.dx,
      origDy: existing.dy,
      moved: false
    };
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    if (draggingNodeRef.current && draggingNodeRef.current.moved) return;

    if (node.nodeType === 'SANS_CORE') {
      onSelectFocus({ type: 'ALL', id: null });
    } else if (node.nodeType === 'MEMBER' || node.nodeType === 'MEMBER_HERO') {
      onSelectFocus({ type: 'MEMBER', id: node.key });
    } else if (node.nodeType === 'CLUB' || node.nodeType === 'CLUB_HERO') {
      onSelectFocus({ type: 'CLUB', id: node.key });
    } else if (node.nodeType === 'TEAM' || node.nodeType === 'TEAM_HERO') {
      onSelectFocus({ type: 'TEAM', id: node.key });
    } else if (node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO') {
      onSelectFocus({ type: 'KEYWORD', id: node.key });
    }
  };

  const handleResetView = () => {
    setDragOffsets({});
    setTransform({
      x: 0,
      y: 0,
      k: focus.type === 'ALL' ? 0.72 : 0.85
    });
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 overflow-hidden select-none">
      {/* Subtle Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top-Left Floating Context Badge & Mode Switcher */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-90px)]">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-xl px-3.5 py-2 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <div className="text-xs sm:text-sm font-semibold text-slate-800">
            {focus.type === 'ALL' && '🌟 산스(SANS) 전체 연결 그래프'}
            {focus.type === 'MEMBER' && `👤 [${focus.id}]님 중심 연결 관계도`}
            {focus.type === 'CLUB' && `🏛️ [${focus.id}] 중심 지식그래프`}
            {focus.type === 'TEAM' && `🚩 [산스 ${focus.id}] 중심 지식그래프`}
            {focus.type === 'KEYWORD' && `🏷️ [${focus.id}] 공감 연결 그래프`}
          </div>
          {focus.type !== 'ALL' && (
            <button
              onClick={() => onSelectFocus({ type: 'ALL', id: null })}
              className="ml-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
            >
              전체 산스 보기
            </button>
          )}
        </div>

        {/* When a specific member is selected, allow switching between Knowledge Hub View and Direct 1:1 Line View */}
        {focus.type === 'MEMBER' && (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => onChangePersonSubMode('HUB')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                personSubMode === 'HUB'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              클럽·조·키워드 허브 뷰
            </button>
            <button
              onClick={() => onChangePersonSubMode('DIRECT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                personSubMode === 'DIRECT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <GitCommitHorizontal className="w-3.5 h-3.5" />
              1:1 직통 연결선 뷰
            </button>
          </div>
        )}
      </div>

      {/* Bottom-Right Floating Zoom & View Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-md rounded-xl p-1.5">
        <button
          onClick={() =>
            setTransform((p) => ({ ...p, k: Math.min(2.4, p.k * 1.18) }))
          }
          title="확대"
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setTransform((p) => ({ ...p, k: Math.max(0.32, p.k * 0.84) }))
          }
          title="축소"
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="화면 중앙 맞춤"
          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDimUnconnected((v) => !v)}
          title={dimUnconnected ? '호버 시 연결선 강조 켜짐' : '호버 강조 끄기'}
          className={`p-2 rounded-lg transition ${
            dimUnconnected ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {dimUnconnected ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom-Left Legend */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-xl px-3.5 py-2 items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-900 inline-block" />
          <span className="font-medium">산스(SANS)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" />
          <span className="font-medium">16개 클럽 허브</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white border-2 border-indigo-600 inline-block" />
          <span className="font-medium">구성원 (클릭 시 개인 관계도)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
          <span className="font-medium">공감 키워드 · 조(1~20조)</span>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <svg
        ref={svgRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        onPointerLeave={handlePointerUpCanvas}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox="-600 -420 1200 840"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="node-shadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.10" />
          </filter>
          <filter id="hero-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#4F46E5" floodOpacity="0.28" />
          </filter>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Decorative Concentric Orbit Guides when focused */}
          {focus.type !== 'ALL' && (
            <g className="pointer-events-none">
              <circle
                cx={0}
                cy={0}
                r={personSubMode === 'DIRECT' && focus.type === 'MEMBER' ? 300 : 220}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={1.5}
                strokeDasharray="6 6"
              />
              {!(personSubMode === 'DIRECT' && focus.type === 'MEMBER') && (
                <circle
                  cx={0}
                  cy={0}
                  r={435}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth={1.2}
                  strokeDasharray="4 8"
                />
              )}
            </g>
          )}

          {/* ==================== 1. CONNECTION LINES (EDGES) ==================== */}
          <g>
            {edges.map((edge) => {
              const s = nodeById.get(edge.source);
              const t = nodeById.get(edge.target);
              if (!s || !t) return null;

              const isHighlighted =
                !activeConnectedSet ||
                (activeConnectedSet.has(edge.source) && activeConnectedSet.has(edge.target));

              const opacity =
                activeConnectedSet && dimUnconnected
                  ? isHighlighted
                    ? 0.95
                    : 0.12
                  : edge.isPrimary
                  ? 0.88
                  : 0.65;

              // Slight curve for elegance and readability
              const dx = t.x - s.x;
              const dy = t.y - s.y;
              const mx = (s.x + t.x) / 2;
              const my = (s.y + t.y) / 2;

              // Calculate gentle perpendicular curve offset when not radial straight
              const dist = Math.hypot(dx, dy) || 1;
              const curveOffset = edge.isPrimary ? 0 : Math.min(24, dist * 0.06);
              const cx = mx - (dy / dist) * curveOffset;
              const cy = my + (dx / dist) * curveOffset;

              const pathD =
                curveOffset === 0
                  ? `M ${s.x} ${s.y} L ${t.x} ${t.y}`
                  : `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;

              return (
                <g key={edge.id} style={{ opacity, transition: 'opacity 200ms ease' }}>
                  {/* Soft Outer Glow on Primary / Highlighted Lines */}
                  {(edge.isPrimary || (activeConnectedSet && isHighlighted)) && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={edge.color || '#6366F1'}
                      strokeWidth={(edge.width || 2) + 5}
                      strokeOpacity={0.16}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Main Crisp Connection Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color || '#6366F1'}
                    strokeWidth={
                      activeConnectedSet && isHighlighted
                        ? (edge.width || 2) + 1.2
                        : edge.width || 2
                    }
                    strokeDasharray={edge.dashed ? '6 5' : undefined}
                    strokeLinecap="round"
                  />

                  {/* Edge Midpoint Badge in Direct Connection Mode or Primary Labeled Edges */}
                  {edge.label && (focus.type !== 'ALL' || isHighlighted) && (
                    <g transform={`translate(${mx}, ${my})`}>
                      <rect
                        x={-Math.max(38, edge.label.length * 5.8 + (edge.extraCount ? 14 : 0))}
                        y={-11}
                        width={Math.max(76, edge.label.length * 11.6 + (edge.extraCount ? 28 : 0))}
                        height={22}
                        rx={11}
                        fill="#FFFFFF"
                        stroke={edge.color || '#6366F1'}
                        strokeWidth={1.3}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className="text-[10.5px] font-semibold fill-slate-700 pointer-events-none"
                      >
                        {edge.label}
                        {edge.extraCount > 0 ? ` +${edge.extraCount}` : ''}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* ==================== 2. GRAPH NODES ==================== */}
          <g>
            {nodesWithDrag.map((node) => {
              const isHovered = hoveredNodeId === node.id;
              const isConnected = !activeConnectedSet || activeConnectedSet.has(node.id);
              const nodeOpacity =
                activeConnectedSet && dimUnconnected ? (isConnected ? 1 : 0.18) : 1;

              const isHero =
                node.nodeType === 'SANS_CORE' ||
                node.nodeType.endsWith('_HERO');

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{
                    opacity: nodeOpacity,
                    transition: 'opacity 200ms ease'
                  }}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onClick={(e) => handleNodeClick(e, node)}
                  onPointerEnter={() => setHoveredNodeId(node.id)}
                  onPointerLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer group"
                >
                  {/* Pulse Ring for Center Hero Node */}
                  {isHero && (
                    <circle
                      r={node.radius + 10}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={2}
                      strokeOpacity={0.28}
                    />
                  )}

                  {/* Node Circle / Badge */}
                  {node.nodeType === 'CLUB' || node.nodeType === 'CLUB_HERO' ? (
                    <rect
                      x={-node.radius}
                      y={-node.radius}
                      width={node.radius * 2}
                      height={node.radius * 2}
                      rx={node.nodeType === 'CLUB_HERO' ? 20 : 14}
                      fill={node.bg || '#FFFFFF'}
                      stroke={node.color}
                      strokeWidth={isHovered || isHero ? 3.5 : 2.2}
                      filter={isHero ? 'url(#hero-glow)' : 'url(#node-shadow)'}
                    />
                  ) : node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO' ? (
                    <rect
                      x={-(node.radius * 1.65)}
                      y={-(node.radius * 0.72)}
                      width={node.radius * 3.3}
                      height={node.radius * 1.44}
                      rx={node.radius * 0.72}
                      fill={node.bg || '#ECFDF5'}
                      stroke={node.color}
                      strokeWidth={isHovered || isHero ? 3 : 2}
                      filter="url(#node-shadow)"
                    />
                  ) : (
                    <circle
                      r={node.radius}
                      fill={
                        node.nodeType === 'SANS_CORE'
                          ? '#312E81'
                          : node.nodeType === 'MEMBER_HERO'
                          ? '#4F46E5'
                          : node.nodeType === 'TEAM_HERO'
                          ? '#4338CA'
                          : node.bg || '#FFFFFF'
                      }
                      stroke={node.color}
                      strokeWidth={isHovered || isHero ? 3.8 : 2.6}
                      filter={isHero ? 'url(#hero-glow)' : 'url(#node-shadow)'}
                    />
                  )}

                  {/* Center Icon or Avatar Initial inside Node */}
                  {node.nodeType === 'SANS_CORE' && (
                    <text
                      y={5}
                      textAnchor="middle"
                      className="text-[16px] font-extrabold fill-white tracking-tight pointer-events-none"
                    >
                      SANS
                    </text>
                  )}

                  {(node.nodeType === 'CLUB' || node.nodeType === 'CLUB_HERO') && node.club && (
                    <foreignObject
                      x={-16}
                      y={-16}
                      width={32}
                      height={32}
                      className="pointer-events-none"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <ClubIcon
                          name={node.club.icon}
                          className={node.nodeType === 'CLUB_HERO' ? 'w-7 h-7' : 'w-5 h-5'}
                          style={{ color: node.color }}
                        />
                      </div>
                    </foreignObject>
                  )}

                  {(node.nodeType === 'TEAM' || node.nodeType === 'TEAM_HERO') && (
                    <text
                      y={5}
                      textAnchor="middle"
                      className={`font-extrabold pointer-events-none ${
                        node.nodeType === 'TEAM_HERO'
                          ? 'text-[16px] fill-white'
                          : 'text-[13px] fill-indigo-800'
                      }`}
                    >
                      {node.key}
                    </text>
                  )}

                  {(node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO') && (
                    <text
                      y={4}
                      textAnchor="middle"
                      style={{ fill: node.color }}
                      className="text-[11.5px] font-bold pointer-events-none"
                    >
                      {node.label}
                    </text>
                  )}

                  {(node.nodeType === 'MEMBER' || node.nodeType === 'MEMBER_HERO') && (
                    <text
                      y={5}
                      textAnchor="middle"
                      className={`font-bold pointer-events-none ${
                        node.nodeType === 'MEMBER_HERO'
                          ? 'text-[15px] fill-white'
                          : 'text-[13px] fill-slate-800'
                      }`}
                    >
                      {node.label.slice(0, 3)}
                    </text>
                  )}

                  {/* Live Joined Badge Indicator */}
                  {node.member?.isLiveJoined && (
                    <circle
                      cx={node.radius * 0.72}
                      cy={-node.radius * 0.72}
                      r={6}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  )}

                  {/* Node Label Pill Below Circle (For non-keyword nodes) */}
                  {node.nodeType !== 'KEYWORD' && (
                    <g transform={`translate(0, ${node.radius + 16})`}>
                      <rect
                        x={-Math.max(42, node.label.length * 7.2 + 12)}
                        y={-12}
                        width={Math.max(84, node.label.length * 14.4 + 24)}
                        height={24}
                        rx={8}
                        fill={isHero ? '#1E1B4B' : '#FFFFFF'}
                        fillOpacity={0.96}
                        stroke={isHero ? node.color : '#E2E8F0'}
                        strokeWidth={1.2}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className={`text-[12px] font-bold pointer-events-none ${
                          isHero ? 'fill-white' : 'fill-slate-900'
                        }`}
                      >
                        {node.label}
                      </text>

                      {/* Sub-label or Shared Connection Badges under Member Nodes */}
                      {node.subLabel && isHero && (
                        <text
                          x={0}
                          y={22}
                          textAnchor="middle"
                          className="text-[11px] font-semibold fill-indigo-600 pointer-events-none"
                        >
                          {node.subLabel}
                        </text>
                      )}

                      {node.sharedBadges && node.sharedBadges.length > 0 && !isHero && (
                        <g transform="translate(0, 19)">
                          <rect
                            x={-54}
                            y={-9}
                            width={108}
                            height={18}
                            rx={9}
                            fill={node.sharedBadges[0].bg || '#EEF2FF'}
                          />
                          <text
                            x={0}
                            y={3.5}
                            textAnchor="middle"
                            style={{ fill: node.sharedBadges[0].color || '#4F46E5' }}
                            className="text-[10px] font-bold pointer-events-none"
                          >
                            {node.sharedBadges
                              .slice(0, 2)
                              .map((b) => b.text)
                              .join(' · ')}
                            {node.sharedBadges.length > 2
                              ? ` +${node.sharedBadges.length - 2}`
                              : ''}
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
