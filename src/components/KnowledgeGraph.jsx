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
  'Sans 레가타 (SANS REGATTA)': '#38BDF8'
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

const BACKGROUND_STARS = Array.from({ length: 150 }, (_, i) => {
  const seed1 = Math.sin(i * 12.9898) * 43758.5453;
  const seed2 = Math.sin(i * 78.233) * 43758.5453;
  const rx = (seed1 - Math.floor(seed1)) * 2200 - 1100;
  const ry = (seed2 - Math.floor(seed2)) * 1600 - 800;
  const r = i % 5 === 0 ? 2.1 : i % 3 === 0 ? 1.4 : 0.9;
  const opacity = 0.2 + ((i * 17) % 65) / 100;
  return { id: i, x: rx, y: ry, r, opacity };
});

function buildGraphLayout(members, focus, personSubMode = 'HUB') {
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

    addNode({
      id: `member:${targetMember.name}`,
      key: targetMember.name,
      nodeType: 'MEMBER_HERO',
      label: targetMember.name,
      subLabel: `${targetMember.team} · 클럽 ${targetMember.clubs.length}개`,
      member: targetMember,
      x: 0,
      y: 0,
      radius: 44,
      color: '#38BDF8'
    });

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
      const count = connectedColleagues.length;
      const ringRadius = Math.max(340, (count * 122) / (2 * Math.PI));

      connectedColleagues.forEach((item, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, count) - Math.PI / 2;
        const m = item.member;
        const firstClubName = item.sharedClubs[0] || m.clubs[0];
        const lineColor =
          CLUB_STAR_COLORS[firstClubName] || (item.sameTeam ? '#818CF8' : '#34D399');

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
          radius: 24,
          color: lineColor
        });

        addEdge({
          source: `member:${targetMember.name}`,
          target: nodeId,
          kind: 'DIRECT_BRIDGE',
          color: lineColor,
          width: Math.min(4.2, 2.2 + item.totalScore * 0.3),
          label: badges.slice(0, 2).map((b) => b.text).join(' · '),
          extraCount: Math.max(0, badges.length - 2),
          labelPosRatio: idx % 2 === 0 ? 0.45 : 0.64,
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
    const r1Radius = Math.max(230, (r1Count * 115) / (2 * Math.PI));

    ring1Hubs.forEach((hub, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const hx = Math.cos(angle) * r1Radius;
      const hy = Math.sin(angle) * r1Radius;

      addNode({
        ...hub,
        x: hx,
        y: hy,
        angle,
        radius: hub.nodeType === 'CLUB' ? 30 : 25
      });

      addEdge({
        source: `member:${targetMember.name}`,
        target: hub.id,
        kind: `HERO_TO_${hub.hubKind}`,
        color: hub.color,
        width: 3.0,
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
    const r2Radius = Math.max(440, r1Radius + 210, (r2Count * 108) / (2 * Math.PI));

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
        radius: 23,
        color: primaryHub?.color || '#38BDF8'
      });

      item.matchingHubs.forEach((mh) => {
        addEdge({
          source: mh.id,
          target: memberNodeId,
          kind: `${mh.hubKind}_TO_MEMBER`,
          color: mh.color,
          width: mh.hubKind === 'CLUB' ? 2.2 : 1.8,
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
      radius: 48,
      color: starColor
    });

    const r1Count = clubMembers.length;
    const r1Radius = Math.max(225, (r1Count * 115) / (2 * Math.PI));

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
        radius: 25,
        color: starColor
      });

      addEdge({
        source: `club:${targetClub.name}`,
        target: mNodeId,
        kind: 'CLUB_TO_MEMBER',
        color: starColor,
        width: 3.0,
        isPrimary: true
      });
    });

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
            color: sameTeam ? '#818CF8' : '#34D399',
            width: 1.8,
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
      m.clubs.forEach((cName) => {
        if (cName === targetClub.name) return;
        if (!otherClubMap.has(cName)) otherClubMap.set(cName, []);
        otherClubMap.get(cName).push(m);
      });
      if (m.team) {
        if (!teamMap.has(m.team)) teamMap.set(m.team, []);
        teamMap.get(m.team).push(m);
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
    const r2Radius = Math.max(435, r1Radius + 195, (r2Count * 100) / (2 * Math.PI));

    outerNodes.forEach((on, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r2Count) - Math.PI;
      addNode({
        ...on,
        x: Math.cos(angle) * r2Radius,
        y: Math.sin(angle) * r2Radius,
        radius: on.nodeType === 'CLUB' ? 28 : 23
      });

      on.bridgeMembers.forEach((bm) => {
        addEdge({
          source: `member:${bm.name}`,
          target: on.id,
          kind: 'MEMBER_TO_OUTER',
          color: on.color,
          width: on.nodeType === 'CLUB' ? 2.2 : 1.6
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
    const teamMembers = members.filter((m) => m.team === teamName);

    addNode({
      id: `team:${teamName}`,
      key: teamName,
      nodeType: 'TEAM_HERO',
      label: `산스 ${teamName}`,
      subLabel: `소속 구성원 ${teamMembers.length}명`,
      x: 0,
      y: 0,
      radius: 46,
      color: '#818CF8'
    });

    const r1Count = teamMembers.length;
    const r1Radius = Math.max(215, (r1Count * 115) / (2 * Math.PI));

    teamMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;
      const badges = m.clubs.map((c) => ({
        text: clubByName.get(c)?.shortName || c,
        color: CLUB_STAR_COLORS[c] || '#38BDF8'
      }));

      addNode({
        id: mNodeId,
        key: m.name,
        nodeType: 'MEMBER',
        label: m.name,
        subLabel: `클럽 ${m.clubs.length}개`,
        member: m,
        sharedBadges: badges,
        x: Math.cos(angle) * r1Radius,
        y: Math.sin(angle) * r1Radius,
        angle,
        radius: 25,
        color: '#818CF8'
      });

      addEdge({
        source: `team:${teamName}`,
        target: mNodeId,
        kind: 'TEAM_TO_MEMBER',
        color: '#818CF8',
        width: 3.0,
        isPrimary: true
      });
    });

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
    const r2Radius = Math.max(415, r1Radius + 190, (r2Count * 100) / (2 * Math.PI));

    outerHubs.forEach((oh, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r2Count) - Math.PI / 2;
      addNode({
        ...oh,
        x: Math.cos(angle) * r2Radius,
        y: Math.sin(angle) * r2Radius,
        radius: oh.nodeType === 'CLUB' ? 28 : 23
      });

      oh.bridgeMembers.forEach((bm) => {
        addEdge({
          source: `member:${bm.name}`,
          target: oh.id,
          kind: 'MEMBER_TO_HUB',
          color: oh.color,
          width: oh.nodeType === 'CLUB' ? 2.2 : 1.7
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
      radius: 44,
      color: starColor
    });

    const r1Count = kwMembers.length;
    const r1Radius = Math.max(225, (r1Count * 115) / (2 * Math.PI));

    kwMembers.forEach((m, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, r1Count) - Math.PI / 2;
      const mNodeId = `member:${m.name}`;
      const badges = [
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
        radius: 25,
        color: starColor
      });

      addEdge({
        source: `keyword:${keyword}`,
        target: mNodeId,
        kind: 'KEYWORD_TO_MEMBER',
        color: starColor,
        width: 2.8,
        isPrimary: true
      });
    });

    return { nodes, edges };
  }

  // =========================================================================
  // 5. DEFAULT FOCUS: ALL SANS NETWORK (산스 전체 연결망)
  // =========================================================================
  addNode({
    id: 'core:SANS',
    key: 'SANS',
    nodeType: 'SANS_CORE',
    label: '산스 (SANS)',
    subLabel: `16개 클럽 · ${members.length}명 연결`,
    x: 0,
    y: 0,
    radius: 50,
    color: '#FBBF24'
  });

  const clubRadius = 265;
  const clubAngles = new Map();

  SANS_CLUBS.forEach((club, idx) => {
    const angle = (2 * Math.PI * idx) / SANS_CLUBS.length - Math.PI / 2;
    clubAngles.set(club.name, angle);
    const clubMembersCount = members.filter((m) => m.clubs.includes(club.name)).length;
    const starColor = CLUB_STAR_COLORS[club.name] || '#38BDF8';

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
      radius: 29,
      color: starColor
    });

    addEdge({
      source: 'core:SANS',
      target: clubNodeId,
      kind: 'SANS_TO_CLUB',
      color: '#475569',
      width: 1.5
    });
  });

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
  const memberRadius = Math.max(500, (mCount * 88) / (2 * Math.PI));

  membersWithAngle.forEach(({ member: m }, idx) => {
    const angle = (2 * Math.PI * idx) / Math.max(1, mCount) - Math.PI;
    const mNodeId = `member:${m.name}`;
    const firstClubName = m.clubs[0];
    const starColor = CLUB_STAR_COLORS[firstClubName] || '#38BDF8';

    const badges = [
      { text: m.team, color: '#818CF8' },
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
      subLabel: m.team,
      member: m,
      sharedBadges: badges,
      x: Math.cos(angle) * memberRadius,
      y: Math.sin(angle) * memberRadius,
      radius: m.clubs.length > 1 ? 23 : 20,
      color: starColor
    });

    if (m.clubs.length > 0) {
      m.clubs.forEach((cName) => {
        addEdge({
          source: `club:${cName}`,
          target: mNodeId,
          kind: 'CLUB_TO_MEMBER',
          color: CLUB_STAR_COLORS[cName] || '#38BDF8',
          width: m.clubs.length > 1 ? 2.2 : 1.7
        });
      });
    } else {
      addEdge({
        source: 'core:SANS',
        target: mNodeId,
        kind: 'SANS_TO_MEMBER',
        color: '#64748B',
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
  onChangePersonSubMode,
  newlyJoinedNames = new Set()
}) {
  const svgRef = useRef(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [dimUnconnected, setDimUnconnected] = useState(true);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.85 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const [dragOffsets, setDragOffsets] = useState({});
  const draggingNodeRef = useRef(null);

  const { nodes, edges } = useMemo(
    () => buildGraphLayout(members, focus, personSubMode),
    [members, focus, personSubMode]
  );

  // Screen-reader accessible summary of current graph state
  const screenReaderSummary = useMemo(() => {
    if (focus.type === 'MEMBER') {
      const person = members.find((m) => m.name === focus.id);
      return buildMemberConnectionSummaryText(person, members);
    }
    if (focus.type === 'CLUB') {
      const clubMembers = members.filter((m) => m.clubs.includes(focus.id));
      return `${focus.id} 중심 연결망입니다. 총 ${clubMembers.length}명의 구성원(${clubMembers
        .map((m) => m.name)
        .join(', ')})이 연결되어 있습니다.`;
    }
    if (focus.type === 'TEAM') {
      const teamMembers = members.filter((m) => m.team === focus.id);
      return `산스 ${focus.id} 중심 연결망입니다. 소속 구성원 ${teamMembers.length}명(${teamMembers
        .map((m) => m.name)
        .join(', ')})이 연결되어 있습니다.`;
    }
    return `산스 전체 연결망입니다. 16개 클럽과 총 ${members.length}명의 산스 구성원이 하나로 연결되어 있습니다.`;
  }, [focus, members]);

  useEffect(() => {
    setDragOffsets({});
    setHoveredNodeId(null);
    if (focus.type === 'ALL') {
      setTransform({ x: 0, y: 0, k: 0.72 });
    } else if (focus.type === 'MEMBER' && personSubMode === 'DIRECT') {
      setTransform({ x: 0, y: 0, k: 0.90 });
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
    <div
      role="region"
      aria-label="산스 연결망 지식그래프 시각화 영역"
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #111C38 0%, #090E1E 55%, #040711 100%)'
      }}
    >
      {/* Screen-Reader Live Announcement Region (VoiceOver / TalkBack) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {screenReaderSummary}
      </div>

      {/* Top-Left Floating Context Pill, Voice Readout Button & Mode Switcher */}
      <div className="absolute top-3.5 left-3.5 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-90px)]">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-lg rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22D3EE] animate-pulse" />
          <div className="text-xs sm:text-sm font-extrabold text-white">
            {focus.type === 'ALL' && '🔗 산스(SANS) 전체 연결망'}
            {focus.type === 'MEMBER' && `✨ [${focus.id}]님의 산스 연결망`}
            {focus.type === 'CLUB' && `🏛️ [${focus.id}] 중심 연결망`}
            {focus.type === 'TEAM' && `🚩 [산스 ${focus.id}] 중심 연결망`}
            {focus.type === 'KEYWORD' && `🏷️ [${focus.id}] 공감 연결망`}
          </div>
          {focus.type !== 'ALL' && (
            <button
              onClick={() => onSelectFocus({ type: 'ALL', id: null })}
              aria-label="전체 산스 연결망 보기로 돌아가기"
              className="ml-1 text-xs font-extrabold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/30 px-3 py-1 rounded-xl transition focus-visible:ring-4 focus-visible:ring-amber-400"
            >
              전체 연결망 보기
            </button>
          )}
        </div>

        {/* One-Click Voice Readout of Current Connections for Visually Impaired Users */}
        <button
          type="button"
          onClick={() => speakKorean(screenReaderSummary, true)}
          aria-label="현재 화면의 연결 관계를 음성으로 듣기"
          className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border border-amber-400/50 text-amber-300 shadow-lg rounded-2xl px-3.5 py-2.5 text-xs font-extrabold flex items-center gap-1.5 transition focus-visible:ring-4 focus-visible:ring-amber-400"
        >
          <Volume2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span>현재 연결 음성으로 듣기</span>
        </button>

        {focus.type === 'MEMBER' && (
          <div
            role="group"
            aria-label="개인 연결망 표시 방식 선택"
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-lg rounded-2xl p-1 flex items-center gap-1"
          >
            <button
              onClick={() => onChangePersonSubMode('HUB')}
              aria-pressed={personSubMode === 'HUB'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                personSubMode === 'HUB'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Network className="w-3.5 h-3.5" aria-hidden="true" />
              다중 연결 허브 뷰
            </button>
            <button
              onClick={() => onChangePersonSubMode('DIRECT')}
              aria-pressed={personSubMode === 'DIRECT'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                personSubMode === 'DIRECT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <GitCommitHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              1:1 직통 연결선 뷰
            </button>
          </div>
        )}
      </div>

      {/* Bottom-Right Floating Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-xl rounded-2xl p-1.5">
        <button
          onClick={() => setTransform((p) => ({ ...p, k: Math.min(2.4, p.k * 1.18) }))}
          aria-label="연결망 화면 확대"
          title="확대"
          className="p-2.5 text-slate-200 hover:bg-slate-800 rounded-xl transition focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform((p) => ({ ...p, k: Math.max(0.32, p.k * 0.84) }))}
          aria-label="연결망 화면 축소"
          title="축소"
          className="p-2.5 text-slate-200 hover:bg-slate-800 rounded-xl transition focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          aria-label="연결망 화면 중앙 정렬"
          title="중앙 정렬"
          className="p-2.5 text-slate-200 hover:bg-slate-800 rounded-xl transition focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDimUnconnected((v) => !v)}
          aria-label="연결선 강조 효과 토글"
          title="연결 강조 토글"
          className={`p-2.5 rounded-xl transition ${
            dimUnconnected ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          {dimUnconnected ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom-Left Legend */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-20 bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 shadow-lg rounded-2xl px-4 py-2.5 items-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24] inline-block" />
          <span className="font-bold">중심 노드 (나 / 산스)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-400 shadow-[0_0_8px_#FB7185] inline-block" />
          <span className="font-bold">16개 클럽 허브</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_#38BDF8] inline-block" />
          <span className="font-bold">산스 구성원 (클릭 시 이동)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-400 shadow-[0_0_8px_#34D399] inline-block" />
          <span className="font-bold">공감 키워드 · 조(1~20조)</span>
        </div>
      </div>

      {/* Main Interactive Knowledge Graph SVG */}
      <svg
        ref={svgRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        onPointerLeave={handlePointerUpCanvas}
        aria-hidden="true"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox="-600 -420 1200 840"
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
            <feGaussianBlur stdDeviation="12" result="blur1" />
            <feGaussianBlur stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="nebula-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.16" />
            <stop offset="55%" stopColor="#6366F1" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#090E1E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* ==================== 0. DEEP SPACE STARFIELD & ORBIT RINGS ==================== */}
          <g className="pointer-events-none">
            <circle cx={0} cy={0} r={520} fill="url(#nebula-center)" />

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

            <circle
              cx={0}
              cy={0}
              r={
                focus.type === 'ALL'
                  ? 265
                  : personSubMode === 'DIRECT' && focus.type === 'MEMBER'
                  ? 340
                  : 230
              }
              fill="none"
              stroke="#334155"
              strokeOpacity={0.55}
              strokeWidth={1.2}
              strokeDasharray="5 7"
            />
            {!(personSubMode === 'DIRECT' && focus.type === 'MEMBER') && (
              <circle
                cx={0}
                cy={0}
                r={focus.type === 'ALL' ? 500 : 440}
                fill="none"
                stroke="#1E293B"
                strokeOpacity={0.75}
                strokeWidth={1.2}
                strokeDasharray="3 9"
              />
            )}
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
                    : 0.08
                  : isNewEdge
                  ? 1
                  : edge.isPrimary
                  ? 0.92
                  : 0.68;

              const dx = t.x - s.x;
              const dy = t.y - s.y;
              const mx = (s.x + t.x) / 2;
              const my = (s.y + t.y) / 2;
              const labelRatio = edge.labelPosRatio || 0.5;
              const lx = s.x + dx * labelRatio;
              const ly = s.y + dy * labelRatio;

              const dist = Math.hypot(dx, dy) || 1;
              const curveOffset = edge.isPrimary ? 0 : Math.min(22, dist * 0.05);
              const cx = mx - (dy / dist) * curveOffset;
              const cy = my + (dx / dist) * curveOffset;

              const pathD =
                curveOffset === 0
                  ? `M ${s.x} ${s.y} L ${t.x} ${t.y}`
                  : `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;

              return (
                <g key={edge.id} style={{ opacity, transition: 'opacity 200ms ease' }}>
                  {/* Layer 1: Wide Starlight Nebula Glow */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isNewEdge ? '#FBBF24' : edge.color || '#38BDF8'}
                    strokeWidth={(edge.width || 2) + (isNewEdge ? 8 : 5)}
                    strokeOpacity={isNewEdge ? 0.38 : edge.isPrimary || isHighlighted ? 0.22 : 0.1}
                    strokeLinecap="round"
                  />

                  {/* Layer 2: Crisp Core Connection Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.color || '#38BDF8'}
                    strokeWidth={
                      isNewEdge
                        ? (edge.width || 2) + 1.5
                        : activeConnectedSet && isHighlighted
                        ? (edge.width || 2) + 1.0
                        : edge.width || 2
                    }
                    strokeDasharray={edge.dashed ? '6 5' : undefined}
                    strokeLinecap="round"
                  />

                  {/* Layer 3: Animated Flowing Energy Beam on Newly Arrived Connections or Primary Lines */}
                  {(isNewEdge || edge.isPrimary) && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={isNewEdge ? 2.6 : 1.5}
                      strokeOpacity={isNewEdge ? 0.95 : 0.45}
                      strokeLinecap="round"
                      className="animate-connection-flow"
                    />
                  )}

                  {/* Edge Label Pill */}
                  {edge.label && (focus.type !== 'ALL' || isHighlighted) && (
                    <g transform={`translate(${lx}, ${ly})`}>
                      <rect
                        x={-Math.max(40, edge.label.length * 6.0 + (edge.extraCount ? 14 : 0))}
                        y={-11}
                        width={Math.max(80, edge.label.length * 12.0 + (edge.extraCount ? 28 : 0))}
                        height={22}
                        rx={11}
                        fill="#0F172A"
                        fillOpacity={0.94}
                        stroke={edge.color || '#38BDF8'}
                        strokeWidth={1.5}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className="text-[10.5px] font-extrabold fill-white pointer-events-none"
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
                activeConnectedSet && dimUnconnected ? (isConnected ? 1 : 0.14) : 1;

              const isHero =
                node.nodeType === 'SANS_CORE' || node.nodeType.endsWith('_HERO');
              const isNewlyJoined =
                node.member && newlyJoinedNames.has(node.member.name);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ opacity: nodeOpacity, transition: 'opacity 200ms ease' }}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onClick={(e) => handleNodeClick(e, node)}
                  onPointerEnter={() => setHoveredNodeId(node.id)}
                  onPointerLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer"
                >
                  {/* Real-Time New Arrival Ripple Shockwaves */}
                  {isNewlyJoined && (
                    <g className="pointer-events-none">
                      <circle
                        r={node.radius + 16}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={3}
                        className="animate-ripple-expand"
                      />
                      <circle
                        r={node.radius + 8}
                        fill="#FBBF24"
                        fillOpacity={0.28}
                        filter="url(#supernova-glow)"
                      />
                    </g>
                  )}

                  {/* Outer Corona Halo Ring */}
                  <circle
                    r={node.radius + (isHero ? 14 : isHovered ? 9 : 5)}
                    fill={isNewlyJoined ? '#FBBF24' : node.color}
                    fillOpacity={isHero || isNewlyJoined ? 0.25 : isHovered ? 0.28 : 0.14}
                    filter={isHero || isNewlyJoined ? 'url(#supernova-glow)' : undefined}
                  />

                  {/* Diffraction Star Spikes (✦) */}
                  {(isHero || node.nodeType === 'MEMBER') && (
                    <g
                      stroke={isNewlyJoined ? '#FBBF24' : isHero ? '#FFFFFF' : node.color}
                      strokeOpacity={isHero || isNewlyJoined ? 0.85 : 0.55}
                      strokeWidth={isHero || isNewlyJoined ? 2.0 : 1.2}
                      className="pointer-events-none"
                    >
                      <line
                        x1={-(node.radius + (isHero || isNewlyJoined ? 20 : 8))}
                        y1={0}
                        x2={node.radius + (isHero || isNewlyJoined ? 20 : 8)}
                        y2={0}
                      />
                      <line
                        x1={0}
                        y1={-(node.radius + (isHero || isNewlyJoined ? 20 : 8))}
                        x2={0}
                        y2={node.radius + (isHero || isNewlyJoined ? 20 : 8)}
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
                      rx={node.radius * 0.45}
                      fill="#0F172A"
                      stroke={node.color}
                      strokeWidth={isHovered || isHero ? 3.5 : 2.4}
                      filter="url(#star-glow)"
                    />
                  ) : node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO' ? (
                    <rect
                      x={-(node.radius * 1.75)}
                      y={-(node.radius * 0.72)}
                      width={node.radius * 3.5}
                      height={node.radius * 1.44}
                      rx={node.radius * 0.72}
                      fill="#0F172A"
                      stroke={node.color}
                      strokeWidth={isHovered || isHero ? 3.0 : 2.0}
                      filter="url(#star-glow)"
                    />
                  ) : (
                    <circle
                      r={node.radius}
                      fill={isNewlyJoined ? '#FBBF24' : isHero ? node.color : '#0F172A'}
                      stroke={isNewlyJoined || isHero ? '#FFFFFF' : node.color}
                      strokeWidth={isHovered || isHero || isNewlyJoined ? 3.6 : 2.4}
                      filter={
                        isHero || isNewlyJoined ? 'url(#supernova-glow)' : 'url(#star-glow)'
                      }
                    />
                  )}

                  {node.nodeType === 'MEMBER' && !isNewlyJoined && (
                    <circle
                      r={node.radius - 4}
                      fill="#1E293B"
                      className="pointer-events-none"
                    />
                  )}

                  {/* Floating "✨ NEW 연결!" Badge Above Newly Arrived Member */}
                  {isNewlyJoined && (
                    <g transform={`translate(0, ${-(node.radius + 20)})`}>
                      <rect
                        x={-44}
                        y={-11}
                        width={88}
                        height={22}
                        rx={11}
                        fill="#FBBF24"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className="text-[10.5px] font-black fill-slate-950 pointer-events-none"
                      >
                        ✨ NEW 연결!
                      </text>
                    </g>
                  )}

                  {node.nodeType === 'SANS_CORE' && (
                    <text
                      y={6}
                      textAnchor="middle"
                      className="text-[17px] font-black fill-slate-950 tracking-tight pointer-events-none"
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
                          ? 'text-[16px] fill-slate-950'
                          : 'text-[12.5px] fill-indigo-300'
                      }`}
                    >
                      {node.key}
                    </text>
                  )}

                  {(node.nodeType === 'KEYWORD' || node.nodeType === 'KEYWORD_HERO') && (
                    <text
                      y={4}
                      textAnchor="middle"
                      style={{ fill: node.nodeType === 'KEYWORD_HERO' ? '#0F172A' : node.color }}
                      className="text-[11.5px] font-extrabold pointer-events-none"
                    >
                      {node.label}
                    </text>
                  )}

                  {(node.nodeType === 'MEMBER' || node.nodeType === 'MEMBER_HERO') && (
                    <text
                      y={4.5}
                      textAnchor="middle"
                      className={`font-extrabold pointer-events-none ${
                        node.nodeType === 'MEMBER_HERO' || isNewlyJoined
                          ? 'text-[15px] fill-slate-950'
                          : 'text-[12px] fill-white'
                      }`}
                    >
                      {node.label.slice(0, 3)}
                    </text>
                  )}

                  {/* Nameplate Label Below Node */}
                  {node.nodeType !== 'KEYWORD' && (
                    <g transform={`translate(0, ${node.radius + 16})`}>
                      <rect
                        x={-Math.max(42, node.label.length * 7.2 + 12)}
                        y={-12}
                        width={Math.max(84, node.label.length * 14.4 + 24)}
                        height={24}
                        rx={8}
                        fill={isHero || isNewlyJoined ? '#FBBF24' : '#0F172A'}
                        fillOpacity={0.94}
                        stroke={isHero || isNewlyJoined ? '#FEF08A' : node.color}
                        strokeWidth={isHero || isNewlyJoined ? 1.8 : 1.2}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        className={`text-[12px] font-extrabold pointer-events-none ${
                          isHero || isNewlyJoined ? 'fill-slate-950' : 'fill-white'
                        }`}
                      >
                        {node.label}
                      </text>

                      {node.subLabel && isHero && (
                        <text
                          x={0}
                          y={23}
                          textAnchor="middle"
                          className="text-[11px] font-extrabold fill-cyan-300 pointer-events-none"
                        >
                          {node.subLabel}
                        </text>
                      )}

                      {node.sharedBadges && node.sharedBadges.length > 0 && !isHero && (
                        <g transform="translate(0, 19)">
                          <rect
                            x={-55}
                            y={-9}
                            width={110}
                            height={18}
                            rx={9}
                            fill="#1E293B"
                            stroke={node.sharedBadges[0].color || '#38BDF8'}
                            strokeOpacity={0.5}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={3.5}
                            textAnchor="middle"
                            style={{ fill: node.sharedBadges[0].color || '#38BDF8' }}
                            className="text-[10px] font-extrabold pointer-events-none"
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
