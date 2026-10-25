import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SANS_CLUBS, KEYWORD_CATEGORIES } from '../data/sansData';
import ClubIcon from './ClubIcon';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  GitCommitHorizontal,
  Eye,
  EyeOff,
  Volume2
} from 'lucide-react';
import { buildMemberConnectionSummaryText, speakKorean } from '../utils/a11yVoice';

const CLUB_STAR_COLORS = {
  '멘토링 클럽': '#FBBF24',
  '스피치 클럽': '#FB7185',
  'AI 클럽': '#A78BFA',
  '골프 클럽': '#34D399',
  '논어 클럽': '#F59E0B',
  '댄스 클럽': '#F472B6',
  '러닝 클럽': '#A3E635',
  '바이오 클럽': '#2DD4BF',
  '부동산 클럽': '#60A5FA',
  '연극 클럽': '#FB923C',
  '영화 클럽': '#C084FC',
  '중급 영어 북클럽': '#818CF8',
  '초급 영어 북클럽': '#38BDF8',
  '태극권 클럽': '#F87171',
  'English Speech 클럽': '#22D3EE',
  'Sans 레가타 (SANS REGATTA)': '#38BDF8',
  '인생책편데': '#EC4899',
  '기산편데': '#14B8A6',
  '아트편데': '#F97316',
  '투자북클럽': '#84CC16'
};

function getKeywordStarColor(keyword) {
  for (const cat of KEYWORD_CATEGORIES) {
    if (cat.keywords.includes(keyword)) {
      if (cat.id === 'solidarity') return '#60A5FA';
      if (cat.id === 'growth') return '#34D399';
      if (cat.id === 'vitality') return '#FBBF24';
      if (cat.id === 'warmth') return '#FB7185';
      if (cat.id === 'clublife') return '#A78BFA';
      if (cat.id === 'seasons') return '#2DD4BF';
    }
  }
  return '#38BDF8';
}

const BACKGROUND_STARS = Array.from({ length: 130 }, (_, i) => {
  const seed1 = Math.sin(i * 12.9898) * 43758.5453;
  const seed2 = Math.sin(i * 78.233) * 43758.5453;
  const rx = (seed1 - Math.floor(seed1)) * 2200 - 1100;
  const ry = (seed2 - Math.floor(seed2)) * 1600 - 800;
  const r = i % 5 === 0 ? 2.0 : i % 3 === 0 ? 1.4 : 0.9;
  const opacity = 0.18 + ((i * 17) % 55) / 100;
  return { id: i, x: rx, y: ry, r, opacity };
});

function isSameTeamMatch(m1, m2) {
  if (!m1 || !m2) return null;
  if (m1.allTeams) return m2.team || '전체 조';
  if (m2.allTeams) return m1.team || '전체 조';
  if (m1.team && m1.team === m2.team) return m1.team;
  return null;
}

function buildGraphLayout(
  members,
  focus,
  personSubMode = 'HUB',
  myMemberName = '',
  isMobile = false
) {
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
  // 1. FOCUS: SPECIFIC MEMBER (특정 이름 선택 시 — 개인 연결망)
  // =========================================================================
  if (focus.type === 'MEMBER') {
    const targetMember = members.find((m) => m.name === focus.id);
    if (!targetMember) {
      return buildGraphLayout(members, { type: 'ALL' }, personSubMode);
    }

    // If 이동훈 대표님 is selected, show him at the center of SANS with all 16 clubs & members!
    if (targetMember.isRepresentative) {
      return buildGraphLayout(members, { type: 'ALL', highlightRep: true }, personSubMode);
    }

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
      color: '#38BDF8'
    });

    const connectedColleagues = [];
    for (const m of members) {
      if (m.name === targetMember.name) continue;
      const sharedClubs = m.clubs.filter((c) => targetMember.clubs.includes(c));
      const sameTeam = isSameTeamMatch(targetMember, m);
      const sharedKeywords = m.keywords.filter((k) => targetMember.keywords.includes(k));

      if (sharedClubs.length > 0 || sameTeam || sharedKeywords.length > 0) {
        connectedColleagues.push({
          member: m,
          sharedClubs,
          sameTeam,
          sharedKeywords,
          totalScore:
            (m.isRepresentative ? 10 : 0) +
            sharedClubs.length * 3 +
            (sameTeam ? 3 : 0) +
            sharedKeywords.length * 2
        });
      }
    }

    if (personSubMode === 'DIRECT') {
      const count = connectedColleagues.length;
      const ringRadius = Math.max(320, (count * 130) / (2 * Math.PI));

      connectedColleagues.forEach((item, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
        const m = item.member;
        const firstClubName = item.sharedClubs[0] || m.clubs[0];
        const lineColor = m.isRepresentative
          ? '#FBBF24'
          : CLUB_STAR_COLORS[firstClubName] || (item.sameTeam ? '#818CF8' : '#34D399');

        const badges = [
          ...item.sharedClubs.map((c) => ({
            text: clubByName.get(c)?.shortName || c,
            color: CLUB_STAR_COLORS[c] || '#38BDF8'
          })),
          ...(item.sameTeam ? [{ text: item.sameTeam, color: '#818CF8' }] : []),
          ...item.sharedKeywords.map((k) => ({
            text: k,
            color: '#34D399'
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
          radius: m.isRepresentative ? 34 : 28,
          color: lineColor
        });

        addEdge({
          source: `member:${targetMember.name}`,
          target: nodeId,
          kind: 'DIRECT_BRIDGE',
          color: lineColor,
          width: Math.min(4.5, 2.4 + item.totalScore * 0.25),
          label: badges.slice(0, 2).map((b) => b.text).join(' · '),
          extraCount: Math.max(0, badges.length - 2),
          labelPosRatio: idx % 2 === 0 ? 0.44 : 0.64,
          isPrimary: true
        });
      });

      return { nodes, edges };
    }

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
        color: CLUB_STAR_COLORS[cName] || '#A78BFA',
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
        color: '#818CF8',
        hubKind: 'TEAM'
      });
    }

    for (const kw of targetMember.keywords) {
      ring1Hubs.push({
        id: `keyword:${kw}`,
        key: kw,
        nodeType: 'KEYWORD',
        label: kw,
        subLabel: '공감 키워드',
        color: getKeywordStarColor(kw),
        hubKind: 'KEYWORD'
      });
    }

    const r1Count = ring1Hubs.length;
    const r1Radius = Math.max(220, (r1Count * 120) / (2 * Math.PI));

    ring1Hubs.forEach((hub, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const hx = Math.cos(angle) * r1Radius;
      const hy = Math.sin(angle) * r1Radius;

      addNode({
        ...hub,
        x: hx,
        y: hy,
        angle,
        radius: hub.nodeType === 'CLUB' ? 34 : 28
      });

      addEdge({
        source: `member:${targetMember.name}`,
        target: hub.id,
        kind: `HERO_TO_${hub.hubKind}`,
        color: hub.color,
        width: 3.2,
        isPrimary: true
      });
    });

    const scoredWithAngle = connectedColleagues.map((item) => {
      const matchingHubs = ring1Hubs.filter(
        (h) =>
          (h.hubKind === 'CLUB' && item.sharedClubs.includes(h.key)) ||
          (h.hubKind === 'TEAM' && item.sameTeam === h.key) ||
          (h.hubKind === 'KEYWORD' && item.sharedKeywords.includes(h.key))
      );

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

    scoredWithAngle.sort((a, b) => a.preferredAngle - b.preferredAngle);

    const r2Count = scoredWithAngle.length;
    const r2Radius = Math.max(420, r1Radius + 195, (r2Count * 115) / (2 * Math.PI));

    scoredWithAngle.forEach((item, idx) => {
      const evenAngle = (2 * Math.PI * idx) / Math.max(1, r2Count) - Math.PI;
      const m = item.member;
      const mx = Math.cos(evenAngle) * r2Radius;
      const my = Math.sin(evenAngle) * r2Radius;

      const badges = [
        ...item.sharedClubs.map((c) => ({
          text: clubByName.get(c)?.shortName || c,
          color: CLUB_STAR_COLORS[c] || '#38BDF8'
        })),
        ...(item.sameTeam ? [{ text: item.sameTeam, color: '#818CF8' }] : []),
        ...item.sharedKeywords.map((k) => ({
          text: k,
          color: '#34D399'
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
        radius: m.isRepresentative ? 32 : 27,
        color: m.isRepresentative ? '#FBBF24' : primaryHub?.color || '#38BDF8'
      });

      item.matchingHubs.forEach((mh) => {
        addEdge({
          source: mh.id,
          target: memberNodeId,
          kind: `${mh.hubKind}_TO_MEMBER`,
          color: m.isRepresentative ? '#FBBF24' : mh.color,
          width: mh.hubKind === 'CLUB' ? 2.4 : 1.9,
          isPrimary: false
        });
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 2. FOCUS: SPECIFIC CLUB (클럽 선택 시 — 클럽 중심 연결망)
  // =========================================================================
  if (focus.type === 'CLUB') {
    const targetClub = SANS_CLUBS.find((c) => c.name === focus.id) || SANS_CLUBS[0];
    const clubMembers = members.filter((m) => m.clubs.includes(targetClub.name));
    const starColor = CLUB_STAR_COLORS[targetClub.name] || '#38BDF8';

    addNode({
      id: `club:${targetClub.name}`,
      key: targetClub.name,
      nodeType: 'CLUB_HERO',
      label: targetClub.name,
      subLabel: `소속 구성원 ${clubMembers.length}명`,
      club: targetClub,
      x: 0,
      y: 0,
      radius: 52,
      color: starColor
    });

    const r1Count = clubMembers.length;
    const r1Radius = Math.max(220, (r1Count * 125) / (2 * Math.PI));

    clubMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;

      const badges = [
        { text: m.team, color: '#818CF8' },
        ...m.keywords.slice(0, 2).map((k) => ({
          text: k,
          color: '#34D399'
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
        angle,
        radius: m.isRepresentative ? 32 : 28,
        color: m.isRepresentative ? '#FBBF24' : starColor
      });

      addEdge({
        source: `club:${targetClub.name}`,
        target: mNodeId,
        kind: 'CLUB_TO_MEMBER',
        color: m.isRepresentative ? '#FBBF24' : starColor,
        width: 3.2,
        isPrimary: true
      });
    });

    for (let i = 0; i < clubMembers.length; i++) {
      for (let j = i + 1; j < clubMembers.length; j++) {
        const m1 = clubMembers[i];
        const m2 = clubMembers[j];
        if (m1.isRepresentative || m2.isRepresentative) continue;
        const sharedKw = m1.keywords.filter((k) => m2.keywords.includes(k));
        const sameTeam = m1.team === m2.team ? m1.team : null;
        if (sharedKw.length > 0 || sameTeam) {
          addEdge({
            source: `member:${m1.name}`,
            target: `member:${m2.name}`,
            kind: 'PEER_RESONANCE',
            color: sameTeam ? '#818CF8' : '#34D399',
            width: 2.0,
            dashed: true,
            label: sameTeam || sharedKw[0]
          });
        }
      }
    }

    const outerNodes = [];
    const otherClubMap = new Map();
    const teamMap = new Map();
    const kwMap = new Map();

    clubMembers.forEach((m) => {
      if (!m.isRepresentative) {
        m.clubs.forEach((cName) => {
          if (cName === targetClub.name) return;
          if (!otherClubMap.has(cName)) otherClubMap.set(cName, []);
          otherClubMap.get(cName).push(m);
        });
        if (m.team) {
          if (!teamMap.has(m.team)) teamMap.set(m.team, []);
          teamMap.get(m.team).push(m);
        }
      }
      m.keywords.forEach((kw) => {
        if (!kwMap.has(kw)) kwMap.set(kw, []);
        kwMap.get(kw).push(m);
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
        club: cObj,
        color: CLUB_STAR_COLORS[cName] || '#A78BFA',
        bridgeMembers
      });
    }

    for (const [tName, tMembers] of teamMap.entries()) {
      outerNodes.push({
        id: `team:${tName}`,
        key: tName,
        nodeType: 'TEAM',
        label: `산스 ${tName}`,
        color: '#818CF8',
        bridgeMembers: tMembers
      });
    }

    for (const [kw, kMembers] of kwMap.entries()) {
      outerNodes.push({
        id: `keyword:${kw}`,
        key: kw,
        nodeType: 'KEYWORD',
        label: kw,
        color: getKeywordStarColor(kw),
        bridgeMembers: kMembers
      });
    }

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
    const r2Radius = Math.max(415, r1Radius + 185, (r2Count * 108) / (2 * Math.PI));

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
  // 3. FOCUS: SPECIFIC TEAM (1조~20조 선택 시 — 조 중심 연결망)
  // =========================================================================
  if (focus.type === 'TEAM') {
    const teamName = focus.id;
    const teamMembers = members.filter((m) => m.team === teamName || m.allTeams);

    addNode({
      id: `team:${teamName}`,
      key: teamName,
      nodeType: 'TEAM_HERO',
      label: `산스 ${teamName}`,
      subLabel: `소속 구성원 ${teamMembers.length}명`,
      x: 0,
      y: 0,
      radius: 50,
      color: '#818CF8'
    });

    const r1Count = teamMembers.length;
    const r1Radius = Math.max(210, (r1Count * 125) / (2 * Math.PI));

    teamMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;
      const badges = m.isRepresentative
        ? [{ text: '전체 클럽 · 전체 조', color: '#FBBF24' }]
        : m.clubs.map((c) => ({
            text: clubByName.get(c)?.shortName || c,
            color: CLUB_STAR_COLORS[c] || '#38BDF8'
          }));

      addNode({
        id: mNodeId,
        key: m.name,
        nodeType: 'MEMBER',
        label: m.name,
        subLabel: m.isRepresentative ? '산스 대표' : `클럽 ${m.clubs.length}개`,
        member: m,
        sharedBadges: badges,
        x: Math.cos(angle) * r1Radius,
        y: Math.sin(angle) * r1Radius,
        angle,
        radius: m.isRepresentative ? 32 : 28,
        color: m.isRepresentative ? '#FBBF24' : '#818CF8'
      });

      addEdge({
        source: `team:${teamName}`,
        target: mNodeId,
        kind: 'TEAM_TO_MEMBER',
        color: m.isRepresentative ? '#FBBF24' : '#818CF8',
        width: 3.2,
        isPrimary: true
      });
    });

    const outerHubs = [];
    const clubMap = new Map();
    const kwMap = new Map();

    teamMembers.forEach((m) => {
      if (!m.isRepresentative) {
        m.clubs.forEach((cName) => {
          if (!clubMap.has(cName)) clubMap.set(cName, []);
          clubMap.get(cName).push(m);
        });
      }
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
        club: cObj,
        color: CLUB_STAR_COLORS[cName] || '#A78BFA',
        bridgeMembers: cMembers
      });
    }

    for (const [kw, kMembers] of kwMap.entries()) {
      outerHubs.push({
        id: `keyword:${kw}`,
        key: kw,
        nodeType: 'KEYWORD',
        label: kw,
        color: getKeywordStarColor(kw),
        bridgeMembers: kMembers
      });
    }

    const r2Count = outerHubs.length;
    const r2Radius = Math.max(395, r1Radius + 175, (r2Count * 105) / (2 * Math.PI));

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
  // 4. FOCUS: SPECIFIC KEYWORD (키워드 중심 연결망)
  // =========================================================================
  if (focus.type === 'KEYWORD') {
    const keyword = focus.id;
    const starColor = getKeywordStarColor(keyword);
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
      color: starColor
    });

    const r1Count = kwMembers.length;
    const r1Radius = Math.max(210, (r1Count * 130) / (2 * Math.PI));

    kwMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;
      const badges = m.isRepresentative
        ? [{ text: `전체 조 · ${SANS_CLUBS.length}개 클럽`, color: '#FBBF24' }]
        : [
            { text: m.team, color: '#818CF8' },
            ...m.clubs.map((c) => ({
              text: clubByName.get(c)?.shortName || c,
              color: CLUB_STAR_COLORS[c] || '#38BDF8'
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
        radius: m.isRepresentative ? 32 : 28,
        color: m.isRepresentative ? '#FBBF24' : starColor
      });

      addEdge({
        source: `keyword:${keyword}`,
        target: mNodeId,
        kind: 'KEYWORD_TO_MEMBER',
        color: m.isRepresentative ? '#FBBF24' : starColor,
        width: 3.2,
        isPrimary: true
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 5. DEFAULT FOCUS: ALL SANS NETWORK (중심: 이동훈 대표님 · 산스 SANS)
  // =========================================================================
  const repMember = members.find((m) => m.isRepresentative) || {
    name: '이동훈 대표님',
    team: '전체 조'
  };

  addNode({
    id: 'core:SANS',
    key: repMember.name,
    nodeType: 'SANS_CORE',
    label: '이동훈 대표님',
    subLabel: `산스(SANS) · 전체 조 · ${SANS_CLUBS.length}개 클럽 · ${members.length}명 연결`,
    member: repMember,
    x: 0,
    y: 0,
    radius: 58,
    color: '#FBBF24'
  });

  const clubRadius = 285;
  const clubAngles = new Map();

  SANS_CLUBS.forEach((club, idx) => {
    const angle = (2 * Math.PI * idx) / SANS_CLUBS.length - Math.PI / 2;
    clubAngles.set(club.name, angle);
    const clubMembersCount = members.filter((m) => m.clubs.includes(club.name)).length;
    const starColor = CLUB_STAR_COLORS[club.name] || '#38BDF8';

    const shortClubLabel =
      club.shortName === 'Eng Speech'
        ? '영어스피치'
        : club.shortName === 'Sans 레가타'
        ? '레가타'
        : club.shortName;

    const clubNodeId = `club:${club.name}`;
    addNode({
      id: clubNodeId,
      key: club.name,
      nodeType: 'CLUB',
      label: shortClubLabel,
      fullName: club.name,
      subLabel: `${clubMembersCount}명`,
      club,
      x: Math.cos(angle) * clubRadius,
      y: Math.sin(angle) * clubRadius,
      angle,
      radius: 30,
      color: starColor
    });

    addEdge({
      source: 'core:SANS',
      target: clubNodeId,
      kind: 'SANS_TO_CLUB',
      color: '#FBBF24',
      width: 2.0,
      isPrimary: Boolean(focus.highlightRep)
    });
  });

  const rawMyName = (
    myMemberName ||
    (typeof window !== 'undefined' ? localStorage.getItem('sans_my_name') : '') ||
    ''
  ).trim();
  const cleanMyName = members.some((m) => m.name === rawMyName) ? rawMyName : '';

  let regularMembers = members.filter((m) => !m.isRepresentative);

  // If active user name is known, put it FIRST so it's placed at the primary vertical position on mobile!
  if (cleanMyName) {
    const myIdx = regularMembers.findIndex((m) => m.name === cleanMyName);
    if (myIdx > 0) {
      const [myM] = regularMembers.splice(myIdx, 1);
      regularMembers.unshift(myM);
    }
  }

  const mCount = regularMembers.length;
  // On mobile, keep memberRadius within a comfortable vertical span (380 ~ 440)
  const memberRadius = isMobile
    ? Math.min(440, Math.max(380, (mCount * 90) / (2 * Math.PI)))
    : Math.max(515, (mCount * 95) / (2 * Math.PI));

  // Base angle offset: on mobile, start from -Math.PI / 2 (top vertical) so primary node is aligned along the phone's vertical screen!
  const baseAngleOffset = isMobile ? -Math.PI / 2 : -Math.PI;

  regularMembers.forEach((m, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, mCount) + baseAngleOffset;
    const mNodeId = `member:${m.name}`;
    const firstClubName = m.clubs[0];
    const starColor = CLUB_STAR_COLORS[firstClubName] || '#38BDF8';

    const badges = [
      { text: m.team || '산스', color: '#818CF8' },
      ...m.clubs.slice(0, 2).map((c) => ({
        text: clubByName.get(c)?.shortName || c,
        color: CLUB_STAR_COLORS[c] || '#38BDF8'
      }))
    ];

    addNode({
      id: mNodeId,
      key: m.name,
      nodeType: 'MEMBER',
      label: m.name,
      subLabel: m.isDraft ? '방문 중 (내 정보 등록 가능)' : m.team,
      member: m,
      sharedBadges: badges,
      x: Math.cos(angle) * memberRadius,
      y: Math.sin(angle) * memberRadius,
      radius: m.clubs.length > 1 ? 26 : 24,
      color: starColor
    });

    if (m.clubs.length > 0) {
      m.clubs.forEach((cName) => {
        addEdge({
          source: `club:${cName}`,
          target: mNodeId,
          kind: 'CLUB_TO_MEMBER',
          color: CLUB_STAR_COLORS[cName] || '#38BDF8',
          width: m.clubs.length > 1 ? 2.4 : 1.9
        });
      });
    } else {
      addEdge({
        source: 'core:SANS',
        target: mNodeId,
        kind: 'SANS_TO_MEMBER',
        color: '#64748B',
        width: 2.0
      });
    }
  });

  return { nodes, edges };
}

function computeAutoFitScale(
  nodes,
  isMobile = false,
  focus = { type: 'ALL' },
  myMemberName = '',
  svgDimensions = { w: 1240, h: 860 }
) {
  if (!nodes || nodes.length === 0) return { x: 0, y: 0, k: isMobile ? 1.05 : 0.85 };

  // On Mobile when viewing ALL (산스 전체 연결 / 전체 연결 먼저 보기):
  // Focus specifically on [자신의 이름] and [이동훈 대표님]!
  if (isMobile && focus.type === 'ALL') {
    const repNode = nodes.find(
      (n) => n.nodeType === 'SANS_CORE' || n.key === '이동훈 대표님'
    ) || { x: 0, y: 0 };

    const cleanMyName = (
      myMemberName ||
      (typeof window !== 'undefined' ? localStorage.getItem('sans_my_name') : '') ||
      ''
    ).trim();

    let myNode = cleanMyName
      ? nodes.find(
          (n) =>
            n.nodeType === 'MEMBER' &&
            (n.key === cleanMyName || n.label === cleanMyName)
        )
      : null;

    if (!myNode) {
      // Fallback: pick the first regular member node in the graph (e.g. 신동준 or newly joined)
      myNode = nodes.find((n) => n.nodeType === 'MEMBER');
    }

    if (myNode) {
      const midX = (repNode.x + myNode.x) / 2;
      const midY = (repNode.y + myNode.y) / 2;

      // In mobile portrait (vh ~ 960, vw ~ 480):
      const spanY = Math.abs(myNode.y - repNode.y) + 260;
      const spanX = Math.abs(myNode.x - repNode.x) + 240;

      const vh = 960;
      const vw = Math.max(
        380,
        Math.round(vh * (svgDimensions.w / Math.max(1, svgDimensions.h)))
      );

      const fitK = Math.min(vw / spanX, vh / spanY) * 0.94;
      const k = Math.min(1.22, Math.max(0.95, fitK));

      return {
        x: -midX * k,
        y: -midY * k,
        k
      };
    }

    return { x: 0, y: 0, k: 1.15 };
  }

  // General bounding box calculation
  let maxExtent = 240;
  for (const n of nodes) {
    const d = Math.max(Math.abs(n.x) + 110, Math.abs(n.y) + 95);
    if (d > maxExtent) maxExtent = d;
  }

  if (isMobile) {
    // For member/club/team focus on mobile, keep zoom level comfortable and readable!
    const mobileBaseK = Math.min(1.2, Math.max(0.78, 620 / maxExtent));
    return { x: 0, y: 0, k: mobileBaseK };
  }

  const baseK = Math.min(1.25, Math.max(0.68, 415 / maxExtent));
  return { x: 0, y: 0, k: baseK };
}

function getNodeAriaLabel(node) {
  if (node.nodeType === 'SANS_CORE') {
    return `산스 이동훈 대표님. 전체 ${SANS_CLUBS.length}개 클럽과 모든 조에 연결되어 있습니다. 누르면 대표님의 연결을 봅니다.`;
  }
  if (node.nodeType === 'MEMBER_HERO' || node.nodeType === 'MEMBER') {
    const team = node.member?.team || node.subLabel || '';
    return `${node.label}님, 소속: ${team}. 누르면 ${node.label}님의 연결을 봅니다.`;
  }
  if (node.nodeType === 'CLUB' || node.nodeType === 'CLUB_HERO') {
    return `${node.fullName || node.label}. 누르면 이 클럽의 연결을 봅니다.`;
  }
  if (node.nodeType === 'TEAM' || node.nodeType === 'TEAM_HERO') {
    return `산스 ${node.key}. 누르면 이 조의 연결을 봅니다.`;
  }
  if (node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO') {
    return `${node.label} 키워드. 누르면 이 마음을 함께 나눈 분들을 봅니다.`;
  }
  return `${node.label}`;
}

export default function KnowledgeGraph({
  members,
  focus,
  onSelectFocus,
  personSubMode,
  onChangePersonSubMode,
  newlyJoinedNames = new Set(),
  isMobile = false,
  myMemberName = ''
}) {
  const svgRef = useRef(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [dimUnconnected, setDimUnconnected] = useState(true);

  const rawMyName = (
    myMemberName ||
    (typeof window !== 'undefined' ? localStorage.getItem('sans_my_name') : '') ||
    ''
  ).trim();
  const cleanMyName = members.some((m) => m.name === rawMyName) ? rawMyName : '';

  const [svgDimensions, setSvgDimensions] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1240,
    h: typeof window !== 'undefined' ? window.innerHeight : 860
  }));

  useEffect(() => {
    const updateDims = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSvgDimensions({ w: rect.width, h: rect.height });
        }
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    window.addEventListener('orientationchange', updateDims);
    return () => {
      window.removeEventListener('resize', updateDims);
      window.removeEventListener('orientationchange', updateDims);
    };
  }, []);

  const viewBoxStr = useMemo(() => {
    const { w, h } = svgDimensions;
    const isPortrait = h > w;
    if (isPortrait) {
      // Mobile / portrait: match container aspect ratio so 100% of height and width are used without letterboxing!
      const vh = 960;
      const vw = Math.max(380, Math.round(vh * (w / Math.max(1, h))));
      return `${-vw / 2} ${-vh / 2} ${vw} ${vh}`;
    }
    // Desktop / landscape
    const vh = 860;
    const vw = Math.max(1100, Math.round(vh * (w / Math.max(1, h))));
    return `${-vw / 2} ${-vh / 2} ${vw} ${vh}`;
  }, [svgDimensions]);

  const { nodes, edges } = useMemo(
    () => buildGraphLayout(members, focus, personSubMode, myMemberName, isMobile),
    [members, focus, personSubMode, myMemberName, isMobile]
  );

  const [transform, setTransform] = useState(() =>
    computeAutoFitScale(nodes, isMobile, focus, myMemberName, svgDimensions)
  );
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const touchStartRef = useRef({ dist: 0, panX: 0, panY: 0, tx: 0, ty: 0, tk: 1 });

  const [dragOffsets, setDragOffsets] = useState({});
  const draggingNodeRef = useRef(null);

  // Screen-reader accessible summary of current graph state
  const screenReaderSummary = useMemo(() => {
    if (focus.type === 'MEMBER') {
      const person = members.find((m) => m.name === focus.id);
      return buildMemberConnectionSummaryText(person, members);
    }
    if (focus.type === 'CLUB') {
      const clubMembers = members.filter((m) => m.clubs.includes(focus.id));
      return `${focus.id}에는 총 ${clubMembers.length}명(${clubMembers
        .map((m) => m.name)
        .join(', ')})이 함께하고 있습니다.`;
    }
    if (focus.type === 'TEAM') {
      const teamMembers = members.filter((m) => m.team === focus.id || m.allTeams);
      return `${focus.id}에는 총 ${teamMembers.length}명(${teamMembers
        .map((m) => m.name)
        .join(', ')})이 함께하고 있습니다.`;
    }
    return `산스 전체 연결 화면입니다. 중심에 이동훈 대표님이 계시며, ${SANS_CLUBS.length}개 클럽과 총 ${members.length}명의 산스 식구들이 하나로 연결되어 있습니다.`;
  }, [focus, members]);

  // Auto-fit camera scale based on node bounding box so small/medium/large graphs all fill the viewport!
  useEffect(() => {
    setDragOffsets({});
    setHoveredNodeId(null);
    setTransform(computeAutoFitScale(nodes, isMobile, focus, myMemberName, svgDimensions));
  }, [
    focus.type,
    focus.id,
    personSubMode,
    nodes.length,
    isMobile,
    myMemberName,
    svgDimensions.w,
    svgDimensions.h
  ]);

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

  const activeConnectedSet = useMemo(() => {
    if (!hoveredNodeId) return null;
    const set = new Set([hoveredNodeId]);
    edges.forEach((e) => {
      if (e.source === hoveredNodeId) set.add(e.target);
      if (e.target === hoveredNodeId) set.add(e.source);
    });
    return set;
  }, [hoveredNodeId, edges]);

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => ({
      ...prev,
      k: Math.min(2.5, Math.max(0.35, prev.k * factor))
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
      onSelectFocus({ type: 'MEMBER', id: '이동훈 대표님' });
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
    setTransform(computeAutoFitScale(nodes, isMobile, focus, myMemberName, svgDimensions));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current = {
        dist,
        panX: (t1.clientX + t2.clientX) / 2,
        panY: (t1.clientY + t2.clientY) / 2,
        tx: transform.x,
        ty: transform.y,
        tk: transform.k
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      panStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        tx: transform.x,
        ty: transform.y
      };
      isPanningRef.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / touchStartRef.current.dist;
      const newK = Math.min(3.0, Math.max(0.25, touchStartRef.current.tk * scale));
      setTransform((prev) => ({
        ...prev,
        k: newK
      }));
    } else if (e.touches.length === 1 && isPanningRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - panStartRef.current.x;
      const dy = t.clientY - panStartRef.current.y;
      setTransform((prev) => ({
        ...prev,
        x: panStartRef.current.tx + dx,
        y: panStartRef.current.ty + dy
      }));
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    touchStartRef.current.dist = 0;
  };

  return (
    <div
      role="region"
      aria-label="산스 연결망 지식그래프 시각화 영역"
      className="relative w-full h-full overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'none',
        background: 'radial-gradient(ellipse at 50% 48%, #111C38 0%, #090E1E 58%, #040711 100%)'
      }}
    >
      {/* Screen-Reader Live Announcement Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {screenReaderSummary}
      </div>

      {/* Top-Left Minimal Context Pill, Voice Readout & Mode Switcher */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-90px)]">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-lg rounded-2xl px-4 py-2 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#FBBF24] animate-pulse" />
          <div className="text-xs sm:text-sm font-extrabold text-white">
            {focus.type === 'ALL' &&
              (cleanMyName
                ? `👑 이동훈 대표님과 ${cleanMyName}님의 산스 연결`
                : '👑 이동훈 대표님과 산스 전체 연결')}
            {focus.type === 'MEMBER' && `✨ ${focus.id}님과 연결된 분들`}
            {focus.type === 'CLUB' && `🏛️ ${focus.id} 함께하는 분들`}
            {focus.type === 'TEAM' && `🚩 ${focus.id} 함께하는 분들`}
            {focus.type === 'KEYWORD' && `🏷️ ${focus.id} 마음이 통하는 분들`}
          </div>
          {focus.type !== 'ALL' && (
            <button
              onClick={() => onSelectFocus({ type: 'ALL', id: null })}
              aria-label="전체 산스 연결 화면으로 돌아가기"
              className="ml-1 text-xs font-extrabold text-amber-300 hover:text-white bg-amber-400/20 hover:bg-amber-400/35 border border-amber-400/40 px-3 py-1 rounded-xl transition focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              전체 보기
            </button>
          )}
        </div>

        {/* One-Click Voice Readout of Current Connections */}
        <button
          type="button"
          onClick={() => speakKorean(screenReaderSummary, true)}
          aria-label="현재 연결된 내용을 음성으로 듣기"
          className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border border-amber-400/50 text-amber-300 shadow-lg rounded-2xl px-3.5 py-2 text-xs font-extrabold flex items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
        >
          <Volume2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span className="hidden sm:inline">음성으로 듣기</span>
        </button>

        {focus.type === 'MEMBER' && focus.id !== '이동훈 대표님' && (
          <div
            role="group"
            aria-label="연결 방식 선택"
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-lg rounded-2xl p-1 flex items-center gap-1"
          >
            <button
              onClick={() => onChangePersonSubMode('HUB')}
              aria-pressed={personSubMode === 'HUB'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                personSubMode === 'HUB'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Network className="w-3.5 h-3.5" aria-hidden="true" />
              공통점별로 보기
            </button>
            <button
              onClick={() => onChangePersonSubMode('DIRECT')}
              aria-pressed={personSubMode === 'DIRECT'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                personSubMode === 'DIRECT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GitCommitHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              사람끼리 바로 보기
            </button>
          </div>
        )}
      </div>

      {/* Bottom-Left Compact Zoom Controls (Hidden on mobile to avoid overlapping with bottom dock) */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-20 items-center gap-1.5 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-xl rounded-2xl p-1.5">
        <button
          onClick={() => setTransform((p) => ({ ...p, k: Math.min(2.5, p.k * 1.18) }))}
          aria-label="연결망 화면 확대"
          title="확대"
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-xl transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform((p) => ({ ...p, k: Math.max(0.35, p.k * 0.84) }))}
          aria-label="연결망 화면 축소"
          title="축소"
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-xl transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          aria-label="연결망 화면 중앙 맞춤"
          title="화면 맞춤"
          className="p-2 text-slate-200 hover:bg-slate-800 rounded-xl transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDimUnconnected((v) => !v)}
          aria-label="연결선 강조 효과 토글"
          title="연결 강조 토글"
          className={`p-2 rounded-xl transition ${
            dimUnconnected ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          {dimUnconnected ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Full-Screen Interactive Knowledge Graph SVG */}
      <svg
        ref={svgRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        onPointerLeave={handlePointerUpCanvas}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label="산스 구성원 연결 지도"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox={viewBoxStr}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="star-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="supernova-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="14" result="blur1" />
            <feGaussianBlur stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="nebula-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#38BDF8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#090E1E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* ==================== 0. DEEP SPACE STARFIELD & ORBIT RINGS ==================== */}
          <g className="pointer-events-none">
            <circle cx={0} cy={0} r={540} fill="url(#nebula-center)" />

            {BACKGROUND_STARS.map((st) => (
              <circle
                key={st.id}
                cx={st.x}
                cy={st.y}
                r={st.r}
                fill="#E2E8F0"
                fillOpacity={st.opacity}
              />
            ))}
          </g>

          {/* ==================== 1. CONNECTION LINES ==================== */}
          <g>
            {edges.map((edge) => {
              const s = nodeById.get(edge.source);
              const t = nodeById.get(edge.target);
              if (!s || !t) return null;

              const isNewEdge =
                (s.member && newlyJoinedNames.has(s.member.name)) ||
                (t.member && newlyJoinedNames.has(t.member.name));

              const isHighlighted =
                !activeConnectedSet ||
                (activeConnectedSet.has(edge.source) && activeConnectedSet.has(edge.target));

              const opacity =
                activeConnectedSet && dimUnconnected
                  ? isHighlighted
                    ? 1
                    : 0.1
                  : isNewEdge
                  ? 1
                  : edge.isPrimary
                  ? 0.94
                  : 0.72;

              const dx = t.x - s.x;
              const dy = t.y - s.y;
              const mx = (s.x + t.x) / 2;
              const my = (s.y + t.y) / 2;
              const labelRatio = edge.labelPosRatio || 0.5;
              const lx = s.x + dx * labelRatio;
              const ly = s.y + dy * labelRatio;

              const dist = Math.hypot(dx, dy) || 1;
              const curveOffset = edge.isPrimary ? 0 : Math.min(20, dist * 0.05);
              const cx = mx - (dy / dist) * curveOffset;
              const cy = my + (dx / dist) * curveOffset;

              const pathD =
                curveOffset === 0
                  ? `M ${s.x} ${s.y} L ${t.x} ${t.y}`
                  : `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;

              return (
                <g key={edge.id} style={{ opacity, transition: 'opacity 200ms ease' }}>
                  {/* Layer 1: Wide Starlight Glow */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isNewEdge ? '#FBBF24' : edge.color || '#38BDF8'}
                    strokeWidth={(edge.width || 2) + (isNewEdge ? 9 : 5)}
                    strokeOpacity={isNewEdge ? 0.42 : edge.isPrimary || isHighlighted ? 0.25 : 0.12}
                    strokeLinecap="round"
                  />

                  {/* Layer 2: Crisp Core Connection Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color || '#38BDF8'}
                    strokeWidth={
                      isNewEdge
                        ? (edge.width || 2) + 1.8
                        : activeConnectedSet && isHighlighted
                        ? (edge.width || 2) + 1.2
                        : edge.width || 2.2
                    }
                    strokeDasharray={edge.dashed ? '7 5' : undefined}
                    strokeLinecap="round"
                  />

                  {/* Layer 3: Animated Flowing Energy Beam */}
                  {(isNewEdge || edge.isPrimary) && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={isNewEdge ? 2.8 : 1.6}
                      strokeOpacity={isNewEdge ? 0.95 : 0.5}
                      strokeLinecap="round"
                      className="animate-connection-flow"
                    />
                  )}

                  {/* Edge Label Pill (Large, High-Contrast) */}
                  {edge.label && (focus.type !== 'ALL' || isHighlighted) && (
                    <g transform={`translate(${lx}, ${ly})`}>
                      <rect
                        x={-Math.max(46, edge.label.length * 6.8 + (edge.extraCount ? 16 : 0))}
                        y={-13}
                        width={Math.max(92, edge.label.length * 13.6 + (edge.extraCount ? 32 : 0))}
                        height={26}
                        rx={13}
                        fill="#0F172A"
                        stroke={edge.color || '#38BDF8'}
                        strokeWidth={1.8}
                      />
                      <text
                        x={0}
                        y={4.5}
                        textAnchor="middle"
                        className="text-[12px] font-extrabold fill-white pointer-events-none"
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

          {/* ==================== 2. GRAPH NODES (LARGE, HIGH-CONTRAST) ==================== */}
          <g>
            {nodesWithDrag.map((node) => {
              const isHovered = hoveredNodeId === node.id;
              const isConnected = !activeConnectedSet || activeConnectedSet.has(node.id);
              const nodeOpacity =
                activeConnectedSet && dimUnconnected ? (isConnected ? 1 : 0.15) : 1;

              const isHero =
                node.nodeType === 'SANS_CORE' || node.nodeType.endsWith('_HERO');
              const isNewlyJoined =
                node.member && newlyJoinedNames.has(node.member.name);
              const isMyNode = Boolean(
                cleanMyName &&
                node.nodeType === 'MEMBER' &&
                (node.key === cleanMyName || node.label === cleanMyName)
              );

              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={getNodeAriaLabel(node)}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ opacity: nodeOpacity, transition: 'opacity 200ms ease' }}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onClick={(e) => handleNodeClick(e, node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNodeClick(e, node);
                    }
                  }}
                  onPointerEnter={() => setHoveredNodeId(node.id)}
                  onPointerLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer outline-none"
                >
                  {/* Real-Time New Arrival Ripple Shockwaves */}
                  {isNewlyJoined && (
                    <g className="pointer-events-none">
                      <circle
                        r={node.radius + 18}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={3.5}
                        className="animate-ripple-expand"
                      />
                      <circle
                        r={node.radius + 10}
                        fill="#FBBF24"
                        fillOpacity={0.32}
                        filter="url(#supernova-glow)"
                      />
                    </g>
                  )}

                  {/* Golden Halo and Ring for Current User (My Star) */}
                  {isMyNode && !isNewlyJoined && (
                    <g className="pointer-events-none">
                      <circle
                        r={node.radius + 11}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={2.4}
                        strokeDasharray="5 3"
                        opacity={0.95}
                      />
                      <circle
                        r={node.radius + 6}
                        fill="#FBBF24"
                        fillOpacity={0.22}
                        filter="url(#supernova-glow)"
                      />
                    </g>
                  )}

                  {/* Outer Corona Halo Ring */}
                  <circle
                    r={node.radius + (isHero ? 16 : isHovered ? 10 : 6)}
                    fill={isNewlyJoined ? '#FBBF24' : node.color}
                    fillOpacity={isHero || isNewlyJoined ? 0.28 : isHovered ? 0.32 : 0.16}
                    filter={isHero || isNewlyJoined ? 'url(#supernova-glow)' : undefined}
                  />

                  {/* Diffraction Spikes (✦) */}
                  {(isHero || node.nodeType === 'MEMBER') && (
                    <g
                      stroke={isNewlyJoined ? '#FBBF24' : isHero ? '#FFFFFF' : node.color}
                      strokeOpacity={isHero || isNewlyJoined ? 0.85 : 0.6}
                      strokeWidth={isHero || isNewlyJoined ? 2.2 : 1.4}
                      className="pointer-events-none"
                    >
                      <line
                        x1={-(node.radius + (isHero || isNewlyJoined ? 22 : 10))}
                        y1={0}
                        x2={node.radius + (isHero || isNewlyJoined ? 22 : 10)}
                        y2={0}
                      />
                      <line
                        x1={0}
                        y1={-(node.radius + (isHero || isNewlyJoined ? 22 : 10))}
                        x2={0}
                        y2={node.radius + (isHero || isNewlyJoined ? 22 : 10)}
                      />
                    </g>
                  )}

                  {/* Node Core Shape */}
                  {node.nodeType === 'CLUB' || node.nodeType === 'CLUB_HERO' ? (
                    <rect
                      x={-node.radius}
                      y={-node.radius}
                      width={node.radius * 2}
                      height={node.radius * 2}
                      rx={node.radius * 0.44}
                      fill="#0F172A"
                      stroke={node.color}
                      strokeWidth={isHovered || isHero ? 4.0 : 2.8}
                      filter="url(#star-glow)"
                    />
                  ) : node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO' ? (
                    <rect
                      x={-Math.max(66, node.label.length * 8.5 + 18)}
                      y={node.nodeType === 'KEYWORD_HERO' ? -26 : -20}
                      width={Math.max(132, node.label.length * 17.0 + 36)}
                      height={node.nodeType === 'KEYWORD_HERO' ? 52 : 40}
                      rx={node.nodeType === 'KEYWORD_HERO' ? 26 : 20}
                      fill={node.nodeType === 'KEYWORD_HERO' ? node.color : '#0F172A'}
                      stroke={node.nodeType === 'KEYWORD_HERO' ? '#FFFFFF' : node.color}
                      strokeWidth={isHovered || isHero ? 3.5 : 2.4}
                      filter={isHero ? 'url(#supernova-glow)' : 'url(#star-glow)'}
                    />
                  ) : (
                    <circle
                      r={node.radius}
                      fill={
                        isNewlyJoined
                          ? '#FBBF24'
                          : isHero
                          ? node.color
                          : node.member?.isRepresentative
                          ? '#FBBF24'
                          : '#0F172A'
                      }
                      stroke={
                        isNewlyJoined || isHero || node.member?.isRepresentative
                          ? '#FFFFFF'
                          : node.color
                      }
                      strokeWidth={isHovered || isHero || isNewlyJoined ? 4.2 : 2.8}
                      filter={
                        isHero || isNewlyJoined ? 'url(#supernova-glow)' : 'url(#star-glow)'
                      }
                    />
                  )}

                  {node.nodeType === 'MEMBER' &&
                    !isNewlyJoined &&
                    !node.member?.isRepresentative && (
                      <circle
                        r={node.radius - 4}
                        fill="#1E293B"
                        className="pointer-events-none"
                      />
                    )}

                  {/* Floating "✨ NEW 연결!" Badge Above Newly Arrived Member */}
                  {isNewlyJoined && (
                    <g transform={`translate(0, ${-(node.radius + 22)})`}>
                      <rect
                        x={-48}
                        y={-12}
                        width={96}
                        height={24}
                        rx={12}
                        fill="#FBBF24"
                        stroke="#FFFFFF"
                        strokeWidth={1.8}
                      />
                      <text
                        x={0}
                        y={4.5}
                        textAnchor="middle"
                        className="text-[11.5px] font-black fill-slate-950 pointer-events-none"
                      >
                        ✨ NEW 연결!
                      </text>
                    </g>
                  )}

                  {/* "⭐ 나" Pill Badge above User's Own Node */}
                  {isMyNode && !isNewlyJoined && (
                    <g transform={`translate(0, ${-(node.radius + 16)})`}>
                      <rect
                        x={-19}
                        y={-10}
                        width={38}
                        height={20}
                        rx={10}
                        fill="#FBBF24"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className="text-[11px] font-black fill-slate-950 pointer-events-none"
                      >
                        ⭐ 나
                      </text>
                    </g>
                  )}

                  {/* Center Text for SANS_CORE (이동훈 대표님 at center of SANS) */}
                  {node.nodeType === 'SANS_CORE' && (
                    <g className="pointer-events-none">
                      <text
                        y={-9}
                        textAnchor="middle"
                        className="text-[13px] font-black fill-slate-900 tracking-wider"
                      >
                        SANS
                      </text>
                      <text
                        y={13}
                        textAnchor="middle"
                        className="text-[16px] font-black fill-slate-950 tracking-tight"
                      >
                        이동훈 대표님
                      </text>
                    </g>
                  )}

                  {(node.nodeType === 'CLUB' || node.nodeType === 'CLUB_HERO') && node.club && (
                    <foreignObject
                      x={-18}
                      y={-18}
                      width={36}
                      height={36}
                      className="pointer-events-none"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <ClubIcon
                          name={node.club.icon}
                          className={node.nodeType === 'CLUB_HERO' ? 'w-8 h-8' : 'w-6 h-6'}
                          style={{ color: node.color }}
                        />
                      </div>
                    </foreignObject>
                  )}

                  {(node.nodeType === 'TEAM' || node.nodeType === 'TEAM_HERO') && (
                    <text
                      y={6}
                      textAnchor="middle"
                      className={`font-black pointer-events-none ${
                        node.nodeType === 'TEAM_HERO'
                          ? 'text-[18px] fill-slate-950'
                          : 'text-[14px] fill-indigo-200'
                      }`}
                    >
                      {node.key}
                    </text>
                  )}

                  {/* High-Contrast Text Inside Keyword Nodes */}
                  {(node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO') && (
                    <text
                      y={5}
                      textAnchor="middle"
                      className={`font-black pointer-events-none ${
                        node.nodeType === 'KEYWORD_HERO'
                          ? 'text-[16px] fill-slate-950'
                          : 'text-[13.5px] fill-white'
                      }`}
                    >
                      {node.label}
                    </text>
                  )}

                  {(node.nodeType === 'MEMBER' || node.nodeType === 'MEMBER_HERO') && (
                    <text
                      y={5.5}
                      textAnchor="middle"
                      className={`font-black pointer-events-none ${
                        node.nodeType === 'MEMBER_HERO' ||
                        isNewlyJoined ||
                        node.member?.isRepresentative
                          ? 'text-[16px] fill-slate-950'
                          : 'text-[14px] fill-white'
                      }`}
                    >
                      {node.member?.isRepresentative ? '대표님' : node.label.slice(0, 4)}
                    </text>
                  )}

                  {/* Single Clean Label/Badge Below Node (Zero Duplicate Names) */}
                  {(node.nodeType === 'CLUB' ||
                    node.nodeType === 'CLUB_HERO' ||
                    (node.nodeType === 'MEMBER' && node.member?.isRepresentative)) && (
                    <g transform={`translate(0, ${node.radius + 17})`}>
                      <rect
                        x={-Math.max(44, node.label.length * 7.8 + 12)}
                        y={-13}
                        width={Math.max(88, node.label.length * 15.6 + 24)}
                        height={26}
                        rx={9}
                        fill={
                          isHero || isNewlyJoined || node.member?.isRepresentative
                            ? '#FBBF24'
                            : '#0F172A'
                        }
                        stroke={
                          isHero || isNewlyJoined || node.member?.isRepresentative
                            ? '#FFFFFF'
                            : node.color
                        }
                        strokeWidth={isHero || isNewlyJoined ? 2.0 : 1.5}
                      />
                      <text
                        x={0}
                        y={4.5}
                        textAnchor="middle"
                        className={`text-[13px] font-black pointer-events-none ${
                          isHero || isNewlyJoined || node.member?.isRepresentative
                            ? 'fill-slate-950'
                            : 'fill-white'
                        }`}
                      >
                        {node.label}
                      </text>
                    </g>
                  )}

                  {/* Hero Sub-Label Pill Directly Below Hero Circle */}
                  {node.subLabel &&
                    (node.nodeType === 'SANS_CORE' ||
                      node.nodeType === 'MEMBER_HERO' ||
                      node.nodeType === 'TEAM_HERO' ||
                      node.nodeType === 'CLUB_HERO') && (
                      <g
                        transform={`translate(0, ${
                          node.nodeType === 'CLUB_HERO' ? node.radius + 42 : node.radius + 18
                        })`}
                      >
                        <rect
                          x={-Math.max(70, node.subLabel.length * 6.5 + 14)}
                          y={-12}
                          width={Math.max(140, node.subLabel.length * 13.0 + 28)}
                          height={24}
                          rx={12}
                          fill="#0F172A"
                          stroke={node.nodeType === 'SANS_CORE' ? '#FBBF24' : '#38BDF8'}
                          strokeWidth={1.5}
                        />
                        <text
                          x={0}
                          y={4.5}
                          textAnchor="middle"
                          className={`text-[12px] font-extrabold pointer-events-none ${
                            node.nodeType === 'SANS_CORE' ? 'fill-amber-300' : 'fill-cyan-300'
                          }`}
                        >
                          {node.subLabel}
                        </text>
                      </g>
                    )}

                  {/* Connection / Affiliation Badge Pill Below Regular Member Node */}
                  {node.nodeType === 'MEMBER' &&
                    node.sharedBadges &&
                    node.sharedBadges.length > 0 && (
                      <g
                        transform={`translate(0, ${
                          node.member?.isRepresentative ? node.radius + 40 : node.radius + 15
                        })`}
                      >
                        <rect
                          x={-58}
                          y={-10}
                          width={116}
                          height={20}
                          rx={10}
                          fill="#0F172A"
                          stroke={node.sharedBadges[0].color || '#38BDF8'}
                          strokeWidth={1.3}
                        />
                        <text
                          x={0}
                          y={4}
                          textAnchor="middle"
                          style={{ fill: node.sharedBadges[0].color || '#38BDF8' }}
                          className="text-[11px] font-extrabold pointer-events-none"
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

                  {/* Sub-label for KEYWORD_HERO */}
                  {node.nodeType === 'KEYWORD_HERO' && node.subLabel && (
                    <g transform="translate(0, 42)">
                      <rect
                        x={-68}
                        y={-11}
                        width={136}
                        height={22}
                        rx={11}
                        fill="#0F172A"
                        stroke={node.color}
                        strokeWidth={1.4}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className="text-[12px] font-extrabold fill-cyan-300 pointer-events-none"
                      >
                        {node.subLabel}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Zoom & Center Reset Controls */}
      <div
        className={`absolute z-20 flex flex-col gap-1.5 shadow-xl ${
          isMobile ? 'bottom-36 right-3' : 'bottom-6 right-6'
        }`}
      >
        <button
          type="button"
          onClick={() => setTransform((prev) => ({ ...prev, k: Math.min(2.5, prev.k * 1.25) }))}
          aria-label="그래프 확대"
          title="확대"
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold transition flex items-center justify-center shadow-lg active:scale-95"
        >
          <ZoomIn className="w-4 h-4 text-slate-200" />
        </button>
        <button
          type="button"
          onClick={() => setTransform((prev) => ({ ...prev, k: Math.max(0.35, prev.k * 0.8) }))}
          aria-label="그래프 축소"
          title="축소"
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold transition flex items-center justify-center shadow-lg active:scale-95"
        >
          <ZoomOut className="w-4 h-4 text-slate-200" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          aria-label="그래프 기본 위치로 맞추기"
          title="전체 맞춤"
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold transition flex items-center justify-center shadow-lg active:scale-95"
        >
          <Maximize2 className="w-4 h-4 text-amber-400" />
        </button>
      </div>
    </div>
  );
}
