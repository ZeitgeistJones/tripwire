-- =============================================================================
-- FULL paste-ready one-shot. Paste THIS ENTIRE file into Dune (replace query body).
-- Starts with WITH. Do NOT paste dune-one-shot-24h-twins.sql alone.
-- Exposes "Whale Min $" and "Hump Min $" (max(p99, $1000)) so the app can show
-- live mega threshold vs sitting on the $1k floor.
-- =============================================================================

WITH tracked_tokens AS (
    SELECT t.address, t.name, t.symbol, t.tag
    FROM (
        VALUES
        -- ALL YOUR TRACKED TOKENS (UNCHANGED)
        (0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b, 'Virtuals Protocol', 'VIRTUAL', 'agent-independent'),
        (0x1bc0c42215582d5a085795f4badbac3ff36d1bcb, 'Clanker', 'CLANKER', 'agent-independent'),
        (0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf, 'Venice', 'VENICE', 'agent-independent'),
        (0x1b4617734c43f6159f3a70b7e06d883647512778, 'AWE', 'AWE', 'agent-independent'),
        (0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935, 'FAI', 'FAI', 'agent-independent'),
        (0x22af33fe49fd1fa80c7149773dde5890d3c76f3b, 'Bankr', 'BNKR', 'agent-independent'),
        (0xbdf317f9c153246c429f23f4093087164b145390, 'AI Agent Layer', 'AIFUN', 'agent-independent'),
        (0xcc4adb618253ed0d4d8a188fb901d70c54735e03, 'Agent Zero', 'A0T', 'agent-independent'),
        (0xea17df5cf6d172224892b5477a16acb111182478, 'ElizaOS', 'ELIZAOS', 'agent-independent'),
        (0x54330d28ca3357f294334bdc454a032e7f353416, 'Autonolas', 'OLAS', 'agent-independent'),
        (0xc0041ef357b183448b235a8ea73ce4e4ec8c265f, 'Cookie DAO', 'COOKIE', 'agent-independent'),
        (0xd71552d9e08e5351adb52163b3bbbc4d7de53ce1, 'AITECH Cloud Network', 'ACN', 'agent-independent'),
        (0x7431ada8a591c955a994a21710752ef9b882b8e3, 'Morpheus AI', 'MOR', 'agent-independent'),
        (0x97c806e7665d3afd84a8fe1837921403d59f3dcc, 'Artificial Liquid Intelligence', 'ALI', 'agent-independent'),
        (0x000000000000012def132e61759048be5b5c6033, 'Cortex', 'CX', 'agent-independent'),
        (0x29cc30f9d113b356ce408667aa6433589cecbdca, 'Elsa', 'HEYELSA', 'agent-independent'),
        (0x30c7235866872213f68cb1f08c37cb9eccb93452, 'Wayfinder', 'PROMPT', 'agent-independent'),
        (0x810affc8aadad2824c65e0a2c5ef96ef1de42ba3, 'AXOBOTL', 'AXOBOTL', 'agent-independent'),
        (0xb22a793a81ff5b6ad37f40d5fe1e0ac4184d52f3, 'Big Tony', 'TONY', 'agent-independent'),
        (0xB3D7e0c3C39A1D3F1B304663065A2F83Ddf56d8e, 'AUTONOMOPOLY', 'AUTONO', 'agent-independent'),
        (0xD88FD4a11255E51f64F78b4a7d74456325c2d8dC, 'BitVault Signal', 'BV7X', 'agent-independent'),
        (0x0086cFF0c1E5D17b19F5bCd4c8840a5B4251D959, 'ODEI AI', 'ODAI', 'agent-independent'),
        (0xdd32659b1e7a6a6b3c6e96cd8a4c936bcfea0607, 'Trackgood AI', 'TRAI', 'agent-independent'),
        (0xb2aca4ca8b7bbd9a5388ccb044c87dedf8a51c7c, 'Thirdfy', 'TFY', 'agent-independent'),
        (0xf27b8ef47842E6445E37804896f1BC5e29381b07, 'Doppel', 'Doppel', 'agent-independent'),
        (0x494C4cf6C8F971DDfCa95184282b86220FAB9B07, 'Amper', 'AMPR', 'agent-independent'),
        (0xF714E60f85497D70508F7E356b5DB80e64539BA3, 'PerkOS', 'PERKOS', 'agent-independent'),
        (0x09f87F948C88848363B124C9099CbB58E4Cc7cB6, 'Messy Virgo', 'MESSY', 'agent-independent'),
        (0xb886cf1444bff05e9a99e00543bc4054d423ebfd, 'Toriva', 'TORIVA', 'agent-independent'),
        (0x161e113b8e9bbaefb846f73f31624f6f9607bd44, 'SIMMI', 'SIMMI', 'agent-independent'),
        (0x7ffd8f91b0b1b5c7a2e6c7c9efb8be0a71885b07, 'ARGUE.FUN', 'ARGUE', 'agent-independent'),
        (0xc78fAbC2cB5B9cf59E0Af3Da8E3Bc46d47753A4e, 'Osobot', 'OSO', 'agent-independent'),
        (0x7Ce02e86354EA0Cc3b302AeAdC0Ab56bC7EB44b8, 'SIRE', 'SIRE', 'agent-independent'),
        (0x9d56c29e820Dd13b0580B185d0e0Dc301d27581d, 'Aubrai', 'AUBRAI', 'agent-independent'),
        (0xfc48314ad4aD5bD36a84E8307b86A68A01D95d9C, 'AION 5100', 'AION', 'agent-independent'),

        -- AGENT VIA VIRTUALS
        (0x96419929d7949d6a801a6909c145c8eef6a40431, 'Spectral', 'SPEC', 'agent-via-virtuals'),
        (0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825, 'AIXBT', 'AIXBT', 'agent-via-virtuals'),
        (0xC44141a684f6AA4E36cD9264ab55550B03C88643, 'Ethy AI', 'ETHY', 'agent-via-virtuals'),
        (0x58Db197E91Bc8Cf1587F75850683e4bd0730e6BF, 'Axelrod', 'AXR', 'agent-via-virtuals'),
        (0x731814e491571a2e9ee3c5b1f7f3b962ee8f4870, 'VADER', 'VADER', 'agent-via-virtuals'),
        (0xA4A2E2ca3fBfE21aed83471D28b6f65A233C6e00, 'Ribbita', 'TIBBIR', 'agent-via-virtuals'),
        (0x55cd6469f597452b5a7536e2cd98fde4c1247ee4, 'LUNA', 'LUNA', 'agent-via-virtuals'),
        (0x1c4cca7c5db003824208adda61bd749e55f463a3, 'GAME by Virtuals', 'GAME', 'agent-via-virtuals'),
        (0x2d90785e30a9df6cce329c0171cb8ba0f4a5c17b, 'BYTE by Virtuals', 'BYTE', 'agent-via-virtuals'),
        (0xea87169699dabd028a78d4b91544b4298086baf6, 'SWARM', 'SWARM', 'agent-via-virtuals'),
        (0x1a43287cbfcc5f35082e6e2aa98e5b474fe7bd4e, 'Athena', 'ATHENA', 'agent-via-virtuals'),
        (0x4b5D32A07b8d3eC5D6928cAa30196f8dd6a7C5A9, 'PRXVT', 'PRXVT', 'agent-via-virtuals'),
        (0x15B15FA54b629C634958E8BD639b2fc8af654974, 'Litebeam', 'LBM', 'agent-via-virtuals'),
        (0x05B1266DDCeE093cE060DBF697e230EA9B453633, 'ReplyCorp', 'REPLY', 'agent-via-virtuals'),
        (0xA9E23871156718C1D55e90dad1c4ea8a33480DFd, 'Instaclaw', 'INSTACLAW', 'agent-via-virtuals'),
        (0xdd78523217390bb0d49C7601e7e54C36d71622F0, 'Chromia EVAL', 'EVAL', 'agent-via-virtuals'),
        (0xd63F21E7f4205d59c5b486273C42e261d5CD4d1d, 'BLACK HOLE', 'BLKH', 'agent-via-virtuals'),
        (0xc655C331d1Aa7f96c252F1f40CE13D80eAc53504, 'Music by Virtuals', 'MUSIC', 'agent-via-virtuals'),
        (0x645C7Aa841087E2e7f741C749aB27422fF5BbA8E, 'Iona', 'IONA', 'agent-via-virtuals'),
        (0xdcaa5e062b2be18e52ea6ed7ba232538621ddc10, 'Aurra', 'AURA', 'agent-via-virtuals'),
        (0xcf67815cce72e682eb4429eca46843bed81ca739, 'GAM3S.GG', 'G3', 'agent-via-virtuals'),
        (0x84a9aae8fcc085dbe11524f570716d89b772f430, 'DTRXBT', 'DTRXBT', 'agent-via-virtuals'),
        (0xab964f7b7b6391bd6c4e8512ef00d01f255d9c0d, 'CONVO', 'CONVO', 'agent-via-virtuals'),
        (0x8dd524a86195a6ef95304e7f0dd9c405a2e78859, 'Sage', 'SAGE', 'agent-via-virtuals'),
        (0xe095b8127823708dc07e739ef4149050acc836e7, 'A.T.M.', 'ATM', 'agent-via-virtuals'),
        (0xabd3718656dbb5547d6b426c18b03848d18981ea, 'Wakehacker', 'WAKEAI', 'agent-via-virtuals'),
        (0x164239fa94aec9c4e437bf6890ea8602b759fd74, 'VERONICA', 'VERONICA', 'agent-via-virtuals'),
        (0x64712FbDF19aE8b5B3B6D0478750E3D5e1A17718, 'Waveform', 'WAVE', 'agent-via-virtuals'),
        (0xa023316FA5c85dADF008C611790B3235433e781e, 'MUTE SWAP', 'MUTE', 'agent-via-virtuals'),
        (0x511ef9Ad5E645E533D15DF605B4628e3D0d0Ff53, 'Velvet Unicorn', 'VU', 'agent-via-virtuals'),
        (0x5F6a682A58854C7fBE228712aEEFfcCDe0008Ac0, 'Rabbi Schlomo', 'SHEKEL', 'agent-via-virtuals'),
        (0x80Ded22d9c6487181Ed74D0222Add805815e8dF4, 'Cybercentry', 'CENTRY', 'agent-via-virtuals'),
        (0xaeA742f80922f7C94B8FD91686c9dFbDFE90d9E6, 'Predi', 'PREDI', 'agent-via-virtuals'),
        (0x6AF73D4579c70A24D52e4F4b43EeCB2A75019F94, 'Replicat-One', 'RCAT', 'agent-via-virtuals'),
        (0x3b92844c5abd9f0562c71ebf219628f1676a856d, 'Starly', 'STAR', 'agent-via-virtuals'),
        (0x9e271ec4d66f2b400ad92de8a10e5c9c1914259c, 'Upsider AI', 'UP', 'agent-via-virtuals'),
        (0xa66f68ef2d8091e13585a502464bd11a159cf710, 'Jeff CEO', 'CEO', 'agent-via-virtuals'),
        (0x99956f143dcca77cddf4b2a0fa4d491703244d, 'LYRA', 'LYRA', 'agent-via-virtuals'),
        (0x0b3AE50BaBE7FFa4E1A50569ceE6bDEFd4ccAeE0, '717ai', 'WIRE', 'agent-via-virtuals'),
        (0x352b850b733ab8baB50aED1Dab5D22E3186ce984, '1000x', '1000X', 'agent-via-virtuals'),
        (0x797f214a2CD64a4963A91Fa21c8C55Ec3EBa4714, 'SIBYL', 'SIBYL', 'agent-via-virtuals'),
        (0x79dacb99A8698052a9898E81Fdf883c29efb93cb, 'Acolyte', 'ACOLYT', 'agent-via-virtuals'),
        (0x1A3e429D2D22149Cc61e0f539B112a227c844aa3, 'Loky', 'LOKY', 'agent-via-virtuals'),
        (0xf7b0dd0B642a6ccc2fc4d8FfE2BfFb0caC8C43C8, 'Gekko AI', 'GEKKO', 'agent-via-virtuals'),
        (0x4674F73545F1db4036250ff8C33A39ad1678D864, 'Degenerate SQuiD', 'SQDGN', 'agent-via-virtuals'),
        (0x708c2B2eEb9578dFe4020895139E88F7654647Ff, 'Robostack', 'ROBOT', 'agent-via-virtuals'),
        (0xE74731ba9d1Da6Fd3C8c60Ff363732bebAc5273E, 'maicrotrader', 'MAICRO', 'agent-via-virtuals'),
        (0x22c0a2e55AeD8B317A285ccbd4f3D8eE24C9e5e3, 'Fyni AI', 'FYNI', 'agent-via-virtuals'),
        (0x7d6fcB3327D7E17095fA8B0E3513AC7A3564f5E1, 'Solace', 'SOLACE', 'agent-via-virtuals'),
        (0x83AbFC4bEEC2ecf12995005d751a42df691c09c1, 'H1DR4', 'H1DR4', 'agent-via-virtuals'),
        (0xc796E499CC8f599A2a8280825d8BdA92F7a895e0, 'Neurobro', 'BRO', 'agent-via-virtuals'),
        (0xbfa733702305280F066D470afDFA784fA70e2649, 'Capminal', 'CAP', 'agent-via-virtuals'),
        (0x380337d0180db7D0DF76ac4fAaE2fcea908EE1fC, 'Otto AI', 'OTTO', 'agent-via-virtuals'),
        (0x815269D17C10f0F3dF7249370E0c1B9efe781aa8, 'SANTA', 'SANTA', 'agent-via-virtuals'),
        (0x98aC5B33A4Ef1151f138941c979211599c2fF953, 'VPay', 'VPAY', 'agent-via-virtuals'),
        (0xFAC77f01957ed1B3DD1cbEa992199B8f85B6E886, 'ArAIstotle', 'FACY', 'agent-via-virtuals'),
        (0xe2816b27a5613b0aaf5d6dafa80584156e2fb1b6, 'Jaihoz', 'JAIHOZ', 'agent-via-virtuals'),
        (0x072915a43ac255cde1fa568218e5b6b10d0cb10f, 'Maya World', 'MAYA', 'agent-via-virtuals'),
        (0x54eaf6bb665565bb8897f9d7ad5b3818ded143b4, 'Degen AI', 'DGENAI', 'agent-via-virtuals'),
        (0x4d70f1058b73198f12a76c193aef5db5dd75babd, 'nomAI', 'NOMAI', 'agent-via-virtuals'),
        (0x33479a07983561ab5e27ad435399fc88159eea8b, 'Kolwaii', 'VIBES', 'agent-via-virtuals'),
        (0xcc9ad02796dec5f4f0710df80c1f011af85eb9e1, 'WachAI', 'WACH', 'agent-via-virtuals'),
        (0x06abb84958029468574b28b6e7792a770ccaa2f6, '0xMonk', 'MONK', 'agent-via-virtuals'),
        (0xce1eab31756a48915b7e7bb79c589835aac6242d, 'Gigabrain', 'BRAIN', 'agent-via-virtuals'),
        (0x91273b316240879fd902c0c3fcf7c0158777b42f, 'Olyn', 'OLYN', 'agent-via-virtuals'),
        (0x3b313f5615bbd6b200c71f84ec2f677b94df8674, 'Gloria AI', 'GLORIA', 'agent-via-virtuals'),

        -- CLANKER VIA BANKRBOT PREFORK
        (0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07, 'CLAWD', 'CLAWD', 'clanker-via-bankrbot-prefork'),
        (0xa1f72459dfa10bad200ac160ecd78c6b77a747be, 'Clawnch', 'CLAWNCH', 'clanker-via-bankrbot-prefork'),
        (0x50d2280441372486beecdd328c1854743ebacb07, 'KellyClaude', 'KCLAUDE', 'clanker-via-bankrbot-prefork'),
        (0xf30bf00edd0c22db54c9274b90d2a4c21fc09b07, 'FELIX', 'FELIX', 'clanker-via-bankrbot-prefork'),
        (0x4e6c9f48f73e54ee5f3ab7e2992b2d733d0d0b07, 'Juno Agent', 'JUNO', 'clanker-via-bankrbot-prefork'),

        -- AGENT VIA CLANKER
        (0x7D928816CC9c462DD7adef911De41535E444CB07, 'Faircaster', 'FAIR', 'agent-via-clanker'),
        (0xde61878b0b21ce395266c44d4d548d1c72a3eb07, 'Sairi', 'SAIRI', 'agent-via-clanker'),

        -- AGENT VIA BANKR
        (0x16332535E2c27da578bC2e82bEb09Ce9d3C8EB07, 'ClawBank', 'CLAWBANK', 'agent-via-bankr'),
        (0x5f980dcfc4c0fa3911554cf5ab288ed0eb13dba3, 'Gitlawb', 'GITLAWB', 'agent-via-bankr'),
        (0x9326314259102cfb0448e3a5022188d56e61cba3, 'SMC Factory', 'SMCF', 'agent-via-bankr'),

        -- NON-AGENT VIA BANKR
        (0xc52aedec3374422d7510e294cfaa90799595cba3, 'Surplus Intelligence', 'SURP', 'non-agent-via-bankr'),
        (0xBf8E8f0e8866a7052F948C16508644347c57aba3, 'aeon', 'AEON', 'non-agent-via-bankr'),
        (0xb233bdffd437e60fa451f62c6c09d3804d285ba3, 'nookplot', 'NOOK', 'non-agent-via-bankr'),
        (0xa601877977340862ca67f816eb079958e5bd0ba3, 'BOTCOIN', 'BOTCOIN', 'non-agent-via-bankr'),
        (0x461d3c96d170e551611f54fa466d3d74a680aba3, 'Root Edge', 'ROOT', 'non-agent-via-bankr'),
        (0x65021a79aeef22b17cdc1b768f5e79a8618beba3, 'Robot Money', 'ROBOT', 'non-agent-via-bankr'),
        (0x07E61D8a4e197dfC269e90D7ECe1dF0D26702bA3, 'Basemate', 'BASE', 'non-agent-via-bankr'),
        (0xf1e9baa65d418a9025e1851dd2d37f1ad208bba3, 'Ratspeak', 'RATS', 'non-agent-via-bankr'),
        (0x67a7ca081dc79b45fd1fa059cd3b8dcca779aba3, 'FreeCode', 'FREE', 'non-agent-via-bankr'),
        (0x7afe438411ee3959c7de6f7fb76bf9c769320ba3, 'Blocktronics', 'BLOCK', 'non-agent-via-bankr'),
        (0x26E6e2E7a9289B6485c53Cd498dE510d3a8c8ba3, 'cyb3rwr3n', 'CYB3R', 'non-agent-via-bankr'),
        (0x00cb1fbca324d51325a7264d54072bc073c28ba3, 'DARKSOL', 'DARKSOL', 'non-agent-via-bankr'),
        (0x7b0ee9dcb5c1d4d7cd630c652959951936512ba3, 'Delu', 'DELU', 'non-agent-via-bankr'),
        (0x753f2af0f46361c9ae6fc347797f99b0c9e82ba3, 'grantr', 'GRANTR', 'non-agent-via-bankr'),
        (0x316ffb9c875f900adcf04889e415cc86b564eba3, 'LITCOIN', 'LIT', 'non-agent-via-bankr'),
        (0x85eac631c800af804476b140f87039f742c28ba3, 'WOON', 'WOON', 'non-agent-via-bankr'),
        (0x61d91cff0fc9fbbdb89f505cf8a7422bf95fdba3, '1clawAI', '1CLAW', 'non-agent-via-bankr'),
        (0x721b072dbb616f29eea73ac004e03fd4e884bba3, 'evo', 'EVO', 'non-agent-via-bankr'),
        (0x95ccfD2B81A9667b0Cc979992632F98fc853EBa3, 'HermesOS', 'HERMES', 'non-agent-via-bankr'),
        (0xd7bc6a05a56655FB2052F742B012d1DFD66e1BA3, 'MiroShark', 'MIRO', 'non-agent-via-bankr'),
        (0x39b4b879b8521d6a8c3a87cda64b969327b7fba3, 'TACHI', 'TACHI', 'non-agent-via-bankr'),
        (0x0a56431ecc9d0b39be0b1e27e795f4c4f19d0ba3, 'HALO', 'HALO', 'non-agent-via-bankr'),
        (0x2878cfc54aabdadd9bb5d70dd24d6b91485afba3, 'Polygraph', 'POLY', 'non-agent-via-bankr'),
        (0x591666816c7c527b02a162a88aae75f20b90eba3, 'TEMPO', 'TEMPO', 'non-agent-via-bankr'),
        (0xc46c41005a1a88b0c1491f2b542a4831d6d1eba3, 'A2H', 'A2H', 'non-agent-via-bankr'),
        (0x8070b5e222f1ec077845e46ced2267e0def4cba3, 'Protean', 'PRTN', 'non-agent-via-bankr'),
        (0x3722264aB15a1dfCe5a5af89e6547F7949A8ABA3, 'LienFi', 'LFI', 'non-agent-via-bankr'),

        -- NON-AGENT VIA CLANKER
        (0xB695559b26BB2c9703ef1935c37AeaE9526bab07, 'Moltbook', 'MOLT', 'non-agent-via-clanker'),
        (0x2D57C47BC5D2432FEEEdf2c9150162A9862D3cCf, 'Dickbutt', 'DICKBUTT', 'non-agent-via-clanker'),
        (0x2f6c17fa9f9bC3600346ab4e48C0701e1d5962AE, 'Based Fartcoin', 'Fartcoin', 'non-agent-via-clanker'),
        (0x2b5050F01d64FBb3e4Ac44dc07f0732BFb5ecadF, 'QR coin', 'QR', 'non-agent-via-clanker'),
        (0x17d70172c7c4205bd39ce80f7f0ee660b7dc5a23, 'Dimes', 'DIME', 'non-agent-via-clanker'),
        (0x9Cb41FD9dC6891BAe8187029461bfAADF6CC0C69, 'noice', 'noice', 'non-agent-via-clanker'),
        (0x680BC6ed5c7222E2f29bdBc87f8E8f3400D8Ce04, 'WYDE End Hunger', 'EAT', 'non-agent-via-clanker'),
        (0x0Db510e79909666d6dEc7f5e49370838c16D950f, 'Super Anon', 'ANON', 'non-agent-via-clanker'),
        (0x2100A39f514d8FE3F26963A29B95b030A0A5d4b7, 'UPONLY', 'UPONLY', 'non-agent-via-clanker'),
        (0x774EAeFE73Df7959496Ac92a77279A8D7d690b07, 'Minted Merch', 'mintedmerch', 'non-agent-via-clanker'),
        (0x3d5e487b21e0569048c4d1a60e98c36e1b09db07, 'TurboUSD', 'TUSD', 'non-agent-via-clanker'),
        (0x534b7aad1cdb6f02ec48cabe428f0d9131e40b07, 'minidev', 'MINI', 'non-agent-via-clanker'),
        (0x3ec2156D4c0A9CBdAB4a016633b7BcF6a8d68Ea2, 'DebtReliefBot', 'DRB', 'non-agent-via-clanker'),
        (0x5F09821CBb61e09D2a83124Ae0B56aaa3ae85B07, 'Defense of the Agents', 'DOTA', 'non-agent-via-clanker'),
        (0x2e7df1528f4eA427F48B49Ae8A1f78149db7185A, 'ProductClank', 'PRO', 'non-agent-via-clanker'),
        (0x3977fc913dB86b01a257232C568317798B903B07, 'Cody', 'CODY', 'non-agent-via-clanker'),
        (0x0fD7a301B51d0A83FCAf6718628174D527B373b6, 'luminous', 'LUM', 'non-agent-via-clanker'),
        (0x6f89bcA4eA5931EdFCB09786267b251DeE752b07, 'Regent', 'REGENT', 'non-agent-via-clanker'),
        (0x5eeB2662615782b58251b6f0c3E107571ae1AB07, 'RETAKE.TV', 'RETAKE', 'non-agent-via-clanker'),
        (0x051024B653E8ec69E72693F776c41C2A9401FB07, 'BETRMINT', 'BETR', 'non-agent-via-clanker'),
        (0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7, 'A0x', 'A0X', 'non-agent-via-clanker'),
        (0xC29832025E7652ef58D15F7fA3e232A2fDfaaB07, 'Zoe', 'ZOE', 'non-agent-via-clanker'),

        -- NON-AGENT VIA VIRTUALS
        (0xc2427bf51d99b6ed0da0da103bc51235638ee868, 'Wasabot', 'BOT', 'non-agent-via-virtuals'),
        (0xefc6fd02b39142ffc4a42d1078157f609be0a5b8, 'Shadow Combat League', 'SCL', 'non-agent-via-virtuals'),
        (0x296eB9c4D8fCbd00fBc6D5027e4202BF955fA76f, 'PEAK', 'PEAK', 'non-agent-via-virtuals'),
        (0xbf8566956b4e2D8BEB90c4c19dbb8c67A9290C36, 'VIRGEN', 'VIRGEN', 'non-agent-via-virtuals'),
        (0xd655790b0486fa681c23b955f5ca7cd5f5c8cb07, 'Bio Unit 000', 'BIO', 'non-agent-via-virtuals'),
        (0x919e43a2cce006710090e64bde9e01b38fd7f32f, 'Agent YP', 'AIYP', 'non-agent-via-virtuals'),
        (0xb56b5269c03421765c28aa61037536ea5690741c, 'DessalinesAI', 'DESSAI', 'non-agent-via-virtuals'),
        (0x06a63c498ef95ad1fa4fff841955e512b4b2198a, 'Gluteus Maximus', 'GLUTEU', 'non-agent-via-virtuals'),

        -- NON-AGENT INFRASTRUCTURE
        (0x91dA780BC7f4B7Cf19ABE90411a2a296Ec5FF787, 'Hive Intelligence', 'HINT', 'non-agent-infrastructure'),
        (0x67543CF0304C19CA62AC95ba82FD4F4B40788dc1, 'Rivalz Token', 'RIZ', 'non-agent-infrastructure'),
        (0xb942B75A602fA318ac091370D93d9143Ba345Ba3, 'Mythos Router', 'MYTHOS', 'non-agent-infrastructure'),

        -- NEITHER
        (0x315B8c9A1123c10228d469551033440441b41F0b, 'BEATS on BASE', 'BEATS', 'neither'),
        (0xEb6d78148F001F3aA2f588997c5E102E489Ad341, 'Super Champs', 'CHAMP', 'neither')
    ) AS t(address, name, symbol, tag)
),

token_ages (age_address, deployed_at) AS (
    VALUES
    (0x7431ada8a591c955a994a21710752ef9b882b8e3, TIMESTAMP '2024-05-27 07:14:57'),
    (0x97c806e7665d3afd84a8fe1837921403d59f3dcc, TIMESTAMP '2023-11-30 12:47:33'),
    (0x91273b316240879fd902c0c3fcf7c0158777b42f, TIMESTAMP '2024-09-23 12:10:15'),
    (0xeb6d78148f001f3aa2f588997c5e102e489ad341, TIMESTAMP '2024-05-06 21:40:31'),
    (0x54330d28ca3357f294334bdc454a032e7f353416, TIMESTAMP '2024-02-15 21:56:29'),
    (0x96419929d7949d6a801a6909c145c8eef6a40431, TIMESTAMP '2024-05-02 14:05:41'),
    (0xc0041ef357b183448b235a8ea73ce4e4ec8c265f, TIMESTAMP '2024-06-03 12:21:29'),
    (0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b, TIMESTAMP '2024-03-14 13:36:05'),
    (0x22af33fe49fd1fa80c7149773dde5890d3c76f3b, TIMESTAMP '2024-12-03 04:44:53'),
    (0x55cd6469f597452b5a7536e2cd98fde4c1247ee4, TIMESTAMP '2024-10-16 12:59:47'),
    (0x315b8c9a1123c10228d469551033440441b41f0b, TIMESTAMP '2024-11-16 20:11:13'),
    (0x352b850b733ab8bab50aed1dab5d22e3186ce984, TIMESTAMP '2024-12-13 02:31:49'),
    (0x0db510e79909666d6dec7f5e49370838c16d950f, TIMESTAMP '2024-11-14 02:29:39'),
    (0x79dacb99a8698052a9898e81fdf883c29efb93cb, TIMESTAMP '2024-12-02 23:29:43'),
    (0x1bc0c42215582d5a085795f4badbac3ff36d1bcb, TIMESTAMP '2024-11-08 20:43:33'),
    (0x1a43287cbfcc5f35082e6e2aa98e5b474fe7bd4e, TIMESTAMP '2024-11-19 13:28:55'),
    (0xdd32659b1e7a6a6b3c6e96cd8a4c936bcfea0607, TIMESTAMP '2024-12-16 23:47:47'),
    (0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825, TIMESTAMP '2024-11-02 05:26:35'),
    (0x1c4cca7c5db003824208adda61bd749e55f463a3, TIMESTAMP '2024-09-23 11:42:11'),
    (0x5f6a682a58854c7fbe228712aeeffccde0008ac0, TIMESTAMP '2024-12-22 22:12:25'),
    (0xc796e499cc8f599a2a8280825d8bda92f7a895e0, TIMESTAMP '2024-12-08 13:44:49'),
    (0x0b3ae50babe7ffa4e1a50569cee6bdefd4ccaee0, TIMESTAMP '2024-12-28 19:42:05'),
    (0x06a63c498ef95ad1fa4fff841955e512b4b2198a, TIMESTAMP '2024-10-27 12:43:21'),
    (0x54eaf6bb665565bb8897f9d7ad5b3818ded143b4, TIMESTAMP '2024-12-20 02:43:19'),
    (0xab964f7b7b6391bd6c4e8512ef00d01f255d9c0d, TIMESTAMP '2024-10-01 07:12:15'),
    (0x1a3e429d2d22149cc61e0f539b112a227c844aa3, TIMESTAMP '2024-12-02 15:30:01'),
    (0x4674f73545f1db4036250ff8c33a39ad1678d864, TIMESTAMP '2024-12-04 19:39:43'),
    (0x2f6c17fa9f9bc3600346ab4e48c0701e1d5962ae, TIMESTAMP '2024-12-16 05:01:53'),
    (0xc655c331d1aa7f96c252f1f40ce13d80eac53504, TIMESTAMP '2024-11-27 08:21:03'),
    (0x919e43a2cce006710090e64bde9e01b38fd7f32f, TIMESTAMP '2024-12-11 14:55:43'),
    (0xfc48314ad4ad5bd36a84e8307b86a68a01d95d9c, TIMESTAMP '2024-12-13 13:14:05'),
    (0x645c7aa841087e2e7f741c749ab27422ff5bba8e, TIMESTAMP '2024-09-24 03:55:31'),
    (0xcf67815cce72e682eb4429eca46843bed81ca739, TIMESTAMP '2024-11-27 22:45:53'),
    (0xa4a2e2ca3fbfe21aed83471d28b6f65a233c6e00, TIMESTAMP '2025-01-12 00:30:03'),
    (0x161e113b8e9bbaefb846f73f31624f6f9607bd44, TIMESTAMP '2024-11-29 15:04:53'),
    (0x815269d17c10f0f3df7249370e0c1b9efe781aa8, TIMESTAMP '2024-12-23 10:10:21'),
    (0x67543cf0304c19ca62ac95ba82fd4f4b40788dc1, TIMESTAMP '2025-01-20 15:17:19'),
    (0xb33ff54b9f7242ef1593d2c9bcd8f9df46c77935, TIMESTAMP '2024-11-23 00:44:59'),
    (0x000000000000012def132e61759048be5b5c6033, TIMESTAMP '2024-12-14 01:02:31'),
    (0x731814e491571a2e9ee3c5b1f7f3b962ee8f4870, TIMESTAMP '2024-11-01 19:29:21'),
    (0x820c5f0fb255a1d18fd0ebb0f1ccefbc4d546da7, TIMESTAMP '2025-01-31 21:43:01'),
    (0x0fd7a301b51d0a83fcaf6718628174d527b373b6, TIMESTAMP '2024-11-08 22:10:51'),
    (0xdd78523217390bb0d49c7601e7e54c36d71622f0, TIMESTAMP '2025-01-27 13:26:05'),
    (0x83abfc4beec2ecf12995005d751a42df691c09c1, TIMESTAMP '2024-12-24 14:14:25'),
    (0x84a9aae8fcc085dbe11524f570716d89b772f430, TIMESTAMP '2025-01-14 13:02:37'),
    (0xb22a793a81ff5b6ad37f40d5fe1e0ac4184d52f3, TIMESTAMP '2024-12-09 22:01:13'),
    (0xce1eab31756a48915b7e7bb79c589835aac6242d, TIMESTAMP '2025-01-07 13:31:11'),
    (0x511ef9ad5e645e533d15df605b4628e3d0d0ff53, TIMESTAMP '2024-10-26 06:49:55'),
    (0xbdf317f9c153246c429f23f4093087164b145390, TIMESTAMP '2024-10-30 15:57:53'),
    (0x2d90785e30a9df6cce329c0171cb8ba0f4a5c17b, TIMESTAMP '2025-01-14 15:02:35'),
    (0xe2816b27a5613b0aaf5d6dafa80584156e2fb1b6, TIMESTAMP '2025-01-10 07:02:59'),
    (0x2d57c47bc5d2432feeedf2c9150162a9862d3ccf, TIMESTAMP '2024-12-09 19:50:19'),
    (0x91da780bc7f4b7cf19abe90411a2a296ec5ff787, TIMESTAMP '2024-12-17 12:24:21'),
    (0xf7b0dd0b642a6ccc2fc4d8ffe2bffb0cac8c43c8, TIMESTAMP '2024-12-20 00:12:33'),
    (0x9e271ec4d66f2b400ad92de8a10e5c9c1914259c, TIMESTAMP '2024-12-05 17:17:07'),
    (0x4d70f1058b73198f12a76c193aef5db5dd75babd, TIMESTAMP '2024-12-04 12:04:05'),
    (0x06abb84958029468574b28b6e7792a770ccaa2f6, TIMESTAMP '2025-01-15 12:07:45'),
    (0x2100a39f514d8fe3f26963a29b95b030a0a5d4b7, TIMESTAMP '2025-01-13 18:41:13'),
    (0xdcaa5e062b2be18e52ea6ed7ba232538621ddc10, TIMESTAMP '2025-01-08 17:00:19'),
    (0xc44141a684f6aa4e36cd9264ab55550b03c88643, TIMESTAMP '2025-01-17 08:04:43'),
    (0xe74731ba9d1da6fd3c8c60ff363732bebac5273e, TIMESTAMP '2025-01-09 23:45:43'),
    (0x6af73d4579c70a24d52e4f4b43eecb2a75019f94, TIMESTAMP '2025-01-21 18:41:03'),
    (0x2b5050f01d64fbb3e4ac44dc07f0732bfb5ecadf, TIMESTAMP '2025-02-06 02:05:51'),
    (0x2e7df1528f4ea427f48b49ae8a1f78149db7185a, TIMESTAMP '2025-02-06 12:46:13'),
    (0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf, TIMESTAMP '2025-01-23 16:28:31'),
    (0x1b4617734c43f6159f3a70b7e06d883647512778, TIMESTAMP '2025-02-14 04:59:11'),
    (0x3ec2156d4c0a9cbdab4a016633b7bcf6a8d68ea2, TIMESTAMP '2025-03-07 09:58:57'),
    (0xd71552d9e08e5351adb52163b3bbbc4d7de53ce1, TIMESTAMP '2025-02-11 16:18:31'),
    (0xea87169699dabd028a78d4b91544b4298086baf6, TIMESTAMP '2025-03-06 16:28:03'),
    (0x17d70172c7c4205bd39ce80f7f0ee660b7dc5a23, TIMESTAMP '2025-02-19 07:52:29'),
    (0x30c7235866872213f68cb1f08c37cb9eccb93452, TIMESTAMP '2025-03-20 20:59:29'),
    (0xcc4adb618253ed0d4d8a188fb901d70c54735e03, TIMESTAMP '2025-03-01 13:43:37'),
    (0xb56b5269c03421765c28aa61037536ea5690741c, TIMESTAMP '2025-03-24 09:05:27'),
    (0x051024b653e8ec69e72693f776c41c2a9401fb07, TIMESTAMP '2025-04-27 04:45:17'),
    (0xabd3718656dbb5547d6b426c18b03848d18981ea, TIMESTAMP '2025-04-17 13:00:09'),
    (0x33479a07983561ab5e27ad435399fc88159eea8b, TIMESTAMP '2025-04-18 19:10:07'),
    (0x072915a43ac255cde1fa568218e5b6b10d0cb10f, TIMESTAMP '2025-05-07 11:21:49'),
    (0xbf8566956b4e2d8beb90c4c19dbb8c67a9290c36, TIMESTAMP '2025-05-22 13:01:19'),
    (0x9cb41fd9dc6891bae8187029461bfaadf6cc0c69, TIMESTAMP '2025-05-21 17:47:59'),
    (0x7d6fcb3327d7e17095fa8b0e3513ac7a3564f5e1, TIMESTAMP '2025-05-29 15:38:49'),
    (0xbfa733702305280f066d470afdfa784fa70e2649, TIMESTAMP '2025-05-23 16:01:03'),
    (0x708c2b2eeb9578dfe4020895139e88f7654647ff, TIMESTAMP '2025-05-24 13:31:21'),
    (0x98ac5b33a4ef1151f138941c979211599c2ff953, TIMESTAMP '2025-07-19 14:01:13'),
    (0x3b313f5615bbd6b200c71f84ec2f677b94df8674, TIMESTAMP '2025-05-07 13:09:43'),
    (0xaea742f80922f7c94b8fd91686c9dfbdfe90d9e6, TIMESTAMP '2025-07-09 13:01:11'),
    (0xcc9ad02796dec5f4f0710df80c1f011af85eb9e1, TIMESTAMP '2025-06-25 13:33:09'),
    (0x58db197e91bc8cf1587f75850683e4bd0730e6bf, TIMESTAMP '2025-05-14 13:07:45'),
    (0x80ded22d9c6487181ed74d0222add805815e8df4, TIMESTAMP '2025-06-18 12:01:11'),
    (0x7d928816cc9c462dd7adef911de41535e444cb07, TIMESTAMP '2025-06-26 21:49:11'),
    (0x3d5e487b21e0569048c4d1a60e98c36e1b09db07, TIMESTAMP '2025-07-05 16:15:17'),
    (0xfac77f01957ed1b3dd1cbea992199b8f85b6e886, TIMESTAMP '2025-08-09 00:10:05'),
    (0xa023316fa5c85dadf008c611790b3235433e781e, TIMESTAMP '2025-08-20 17:22:33'),
    (0x316ffb9c875f900adcf04889e415cc86b564eba3, TIMESTAMP '2026-02-24 20:35:39'),
    (0xb233bdffd437e60fa451f62c6c09d3804d285ba3, TIMESTAMP '2026-02-25 03:12:07'),
    (0x774eaefe73df7959496ac92a77279a8d7d690b07, TIMESTAMP '2025-08-24 15:56:53'),
    (0xc78fabc2cb5b9cf59e0af3da8e3bc46d47753a4e, TIMESTAMP '2026-02-03 01:15:55'),
    (0xde61878b0b21ce395266c44d4d548d1c72a3eb07, TIMESTAMP '2026-02-03 17:44:59'),
    (0x5eeb2662615782b58251b6f0c3e107571ae1ab07, TIMESTAMP '2025-08-07 22:49:03'),
    (0x3977fc913db86b01a257232c568317798b903b07, TIMESTAMP '2025-08-22 19:55:19'),
    (0x64712fbdf19ae8b5b3b6d0478750e3d5e1a17718, TIMESTAMP '2025-09-18 16:01:59'),
    (0x721b072dbb616f29eea73ac004e03fd4e884bba3, TIMESTAMP '2026-04-26 20:19:11'),
    (0x164239fa94aec9c4e437bf6890ea8602b759fd74, TIMESTAMP '2025-09-10 07:01:19'),
    (0x9d56c29e820dd13b0580b185d0e0dc301d27581d, TIMESTAMP '2025-08-27 12:29:55'),
    (0x7ce02e86354ea0cc3b302aeadc0ab56bc7eb44b8, TIMESTAMP '2025-08-06 22:48:39'),
    (0x680bc6ed5c7222e2f29bdbc87f8e8f3400d8ce04, TIMESTAMP '2025-12-10 23:12:45'),
    (0xc52aedec3374422d7510e294cfaa90799595cba3, TIMESTAMP '2026-05-16 15:20:31'),
    (0x461d3c96d170e551611f54fa466d3d74a680aba3, TIMESTAMP '2026-05-17 21:19:31'),
    (0x7afe438411ee3959c7de6f7fb76bf9c769320ba3, TIMESTAMP '2026-05-08 12:56:33'),
    (0x16332535e2c27da578bc2e82beb09ce9d3c8eb07, TIMESTAMP '2026-02-09 16:39:29'),
    (0xa9e23871156718c1d55e90dad1c4ea8a33480dfd, TIMESTAMP '2026-02-10 05:11:51'),
    (0x6f89bca4ea5931edfcb09786267b251dee752b07, TIMESTAMP '2025-11-06 16:01:07'),
    (0x05b1266ddcee093ce060dbf697e230ea9b453633, TIMESTAMP '2025-11-07 05:29:21'),
    (0xe095b8127823708dc07e739ef4149050acc836e7, TIMESTAMP '2025-10-13 10:55:55'),
    (0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07, TIMESTAMP '2026-01-26 21:48:55'),
    (0xb2aca4ca8b7bbd9a5388ccb044c87dedf8a51c7c, TIMESTAMP '2025-10-15 10:31:15'),
    (0xb695559b26bb2c9703ef1935c37aeae9526bab07, TIMESTAMP '2026-01-28 17:21:07'),
    (0x50d2280441372486beecdd328c1854743ebacb07, TIMESTAMP '2026-01-30 15:39:09'),
    (0xa1f72459dfa10bad200ac160ecd78c6b77a747be, TIMESTAMP '2026-01-31 03:13:57'),
    (0xea17df5cf6d172224892b5477a16acb111182478, TIMESTAMP '2025-10-09 03:58:53'),
    (0x380337d0180db7d0df76ac4faae2fcea908ee1fc, TIMESTAMP '2025-10-09 12:26:19'),
    (0x7b0ee9dcb5c1d4d7cd630c652959951936512ba3, TIMESTAMP '2026-04-15 20:16:13'),
    (0xb942b75a602fa318ac091370d93d9143ba345ba3, TIMESTAMP '2026-04-16 18:04:35'),
    (0x22c0a2e55aed8b317a285ccbd4f3d8ee24c9e5e3, TIMESTAMP '2025-09-04 14:01:59'),
    (0xd63f21e7f4205d59c5b486273c42e261d5cd4d1d, TIMESTAMP '2025-11-20 23:59:15'),
    (0xd88fd4a11255e51f64f78b4a7d74456325c2d8dc, TIMESTAMP '2026-02-01 17:06:39'),
    (0xf30bf00edd0c22db54c9274b90d2a4c21fc09b07, TIMESTAMP '2026-02-02 17:24:41'),
    (0x67a7ca081dc79b45fd1fa059cd3b8dcca779aba3, TIMESTAMP '2026-03-31 18:21:15'),
    (0x85eac631c800af804476b140f87039f742c28ba3, TIMESTAMP '2026-04-13 20:40:55'),
    (0x95ccfd2b81a9667b0cc979992632f98fc853eba3, TIMESTAMP '2026-04-13 20:49:25'),
    (0xa66f68ef2d8091e13585a502464bd11a159cf710, TIMESTAMP '2025-10-21 12:04:51'),
    (0x07e61d8a4e197dfc269e90d7ece1df0d26702ba3, TIMESTAMP '2026-05-26 17:12:33'),
    (0x0a56431ecc9d0b39be0b1e27e795f4c4f19d0ba3, TIMESTAMP '2026-05-26 20:24:15'),
    (0x15b15fa54b629c634958e8bd639b2fc8af654974, TIMESTAMP '2026-06-12 02:53:19'),
    (0xefc6fd02b39142ffc4a42d1078157f609be0a5b8, TIMESTAMP '2026-04-08 11:52:27'),
    (0x797f214a2cd64a4963a91fa21c8c55ec3eba4714, TIMESTAMP '2026-03-18 21:32:05'),
    (0x810affc8aadad2824c65e0a2c5ef96ef1de42ba3, TIMESTAMP '2026-03-20 18:58:23'),
    (0x00cb1fbca324d51325a7264d54072bc073c28ba3, TIMESTAMP '2026-03-23 12:57:55'),
    (0xd7bc6a05a56655fb2052f742b012d1dfd66e1ba3, TIMESTAMP '2026-03-24 16:48:01'),
    (0x9326314259102cfb0448e3a5022188d56e61cba3, TIMESTAMP '2026-03-25 20:31:29'),
    (0x5f09821cbb61e09d2a83124ae0b56aaa3ae85b07, TIMESTAMP '2026-03-30 13:58:23'),
    (0x8dd524a86195a6ef95304e7f0dd9c405a2e78859, TIMESTAMP '2025-08-21 14:01:43'),
    (0x09f87f948c88848363b124c9099cbb58e4cc7cb6, TIMESTAMP '2025-08-22 05:50:53'),
    (0xc29832025e7652ef58d15f7fa3e232a2fdfaab07, TIMESTAMP '2026-04-30 18:02:11'),
    (0xf1e9baa65d418a9025e1851dd2d37f1ad208bba3, TIMESTAMP '2026-05-18 20:05:33'),
    (0xc46c41005a1a88b0c1491f2b542a4831d6d1eba3, TIMESTAMP '2026-05-19 12:33:05'),
    (0xa601877977340862ca67f816eb079958e5bd0ba3, TIMESTAMP '2026-02-20 01:34:45'),
    (0x61d91cff0fc9fbbdb89f505cf8a7422bf95fdba3, TIMESTAMP '2026-05-12 23:59:15'),
    (0xb3d7e0c3c39a1d3f1b304663065a2f83ddf56d8e, TIMESTAMP '2026-05-14 03:54:55'),
    (0x534b7aad1cdb6f02ec48cabe428f0d9131e40b07, TIMESTAMP '2025-11-13 14:06:01'),
    (0x3b92844c5abd9f0562c71ebf219628f1676a856d, TIMESTAMP '2025-11-14 04:13:13'),
    (0xf27b8ef47842e6445e37804896f1bc5e29381b07, TIMESTAMP '2026-02-05 22:03:51'),
    (0xd655790b0486fa681c23b955f5ca7cd5f5c8cb07, TIMESTAMP '2026-02-06 19:47:43'),
    (0x4e6c9f48f73e54ee5f3ab7e2992b2d733d0d0b07, TIMESTAMP '2026-02-07 08:19:29'),
    (0xbf8e8f0e8866a7052f948c16508644347c57aba3, TIMESTAMP '2026-03-10 22:01:31'),
    (0x5f980dcfc4c0fa3911554cf5ab288ed0eb13dba3, TIMESTAMP '2026-03-11 02:00:07'),
    (0x26e6e2e7a9289b6485c53cd498de510d3a8c8ba3, TIMESTAMP '2026-03-12 03:38:03'),
    (0x65021a79aeef22b17cdc1b768f5e79a8618beba3, TIMESTAMP '2026-03-12 18:27:37'),
    (0x39b4b879b8521d6a8c3a87cda64b969327b7fba3, TIMESTAMP '2026-03-05 00:37:57'),
    (0x296eb9c4d8fcbd00fbc6d5027e4202bf955fa76f, TIMESTAMP '2026-06-05 13:55:45'),
    (0x591666816c7c527b02a162a88aae75f20b90eba3, TIMESTAMP '2026-05-22 10:36:09'),
    (0x8070b5e222f1ec077845e46ced2267e0def4cba3, TIMESTAMP '2026-05-25 04:38:07'),
    (0x753f2af0f46361c9ae6fc347797f99b0c9e82ba3, TIMESTAMP '2026-04-24 02:57:57'),
    (0x2878cfc54aabdadd9bb5d70dd24d6b91485afba3, TIMESTAMP '2026-06-06 19:16:41'),
    (0x4b5d32a07b8d3ec5d6928caa30196f8dd6a7c5a9, TIMESTAMP '2026-01-06 05:20:29'),
    (0xc2427bf51d99b6ed0da0da103bc51235638ee868, TIMESTAMP '2026-01-06 19:26:29'),
    (0x3722264ab15a1dfce5a5af89e6547f7949a8aba3, TIMESTAMP '2026-05-01 16:42:23'),
    (0x494c4cf6c8f971ddfca95184282b86220fab9b07, TIMESTAMP '2026-03-13 00:34:37'),
    (0xb886cf1444bff05e9a99e00543bc4054d423ebfd, TIMESTAMP '2026-03-14 17:16:05'),
    (0x29cc30f9d113b356ce408667aa6433589cecbdca, TIMESTAMP '2026-01-07 22:35:05'),
    (0x0086cff0c1e5d17b19f5bcd4c8840a5b4251d959, TIMESTAMP '2026-02-12 14:06:59'),
    (0xf714e60f85497d70508f7e356b5db80e64539ba3, TIMESTAMP '2026-02-12 21:32:05'),
    (0x7ffd8f91b0b1b5c7a2e6c7c9efb8be0a71885b07, TIMESTAMP '2026-02-13 21:00:09')
),

-- Pre-filtered transaction windows (all limited by time)
base_tx_30d AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '30' day
      AND tx.success = true
),
base_tx_14_7 AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '14' day
      AND tx.block_time <  now() - interval '7' day
      AND tx.success = true
),
base_tx_7d AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '7' day
      AND tx.success = true
),
base_tx_24h AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '1' day
      AND tx.success = true
),

-- Pre-filtered dex trades windows (all limited by time)
dex_trades_30d AS (
    SELECT *
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '30' day
),
dex_trades_14_7 AS (
    SELECT *
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '14' day
      AND dt.block_time <  now() - interval '7' day
),
dex_trades_7d AS (
    SELECT *
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '7' day
),
-- 90d window used ONLY for first-buy/first-sell lookback, narrowed to the
-- three columns needed so the scan stays as light as possible
dex_trades_90d AS (
    SELECT dt.taker, dt.block_time, dt.token_bought_address, dt.token_sold_address
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '90' day
),

metrics_30d AS (
    SELECT
        tt.name AS project,
        tt.symbol,
        tt.tag,
        tt.address,
        COUNT(*) AS txs_30d,
        COUNT(DISTINCT tx."from") AS users_30d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_30d
    FROM base_tx_30d tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1,2,3,4
),

metrics_7d AS (
    SELECT
        tt.name AS project,
        COUNT(*) AS txs_7d,
        COUNT(DISTINCT tx."from") AS users_7d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_7d
    FROM base_tx_7d tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1
),

metrics_24h AS (
    SELECT
        tt.name AS project,
        COUNT(*) AS txs_24h,
        COUNT(DISTINCT tx."from") AS users_24h,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_24h
    FROM base_tx_24h tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1
),

metrics_prev_7d AS (
    SELECT
        tt.name AS project,
        COUNT(*) AS txs_prev_7d,
        COUNT(DISTINCT tx."from") AS users_prev_7d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_prev_7d
    FROM base_tx_14_7 tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1
),

-- Bounded NEW vs RETURNING: 0–30d vs 31–90d
wallet_windows AS (
    SELECT
        tt.name      AS project,
        tx."from"    AS wallet,
        MAX(CASE WHEN tx.block_time >= now() - interval '30' day THEN 1 END) AS active_30d,
        MAX(CASE WHEN tx.block_time >= now() - interval '90' day
                  AND tx.block_time <  now() - interval '30' day THEN 1 END) AS active_prev_60d
    FROM base.transactions tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    WHERE tx.success = true
      AND tx.block_time >= now() - interval '90' day
    GROUP BY 1,2
),

new_vs_returning AS (
    SELECT
        project,
        COUNT(DISTINCT CASE
            WHEN active_30d = 1 AND active_prev_60d IS NULL THEN wallet
        END) AS new_wallets_30d,
        COUNT(DISTINCT CASE
            WHEN active_30d = 1 AND active_prev_60d = 1 THEN wallet
        END) AS returning_wallets_30d
    FROM wallet_windows
    WHERE active_30d = 1
    GROUP BY 1
),

-- Per-wallet counts over 30d
wallet_tx_30d AS (
    SELECT
        tt.name AS project,
        tx."from" AS wallet,
        COUNT(*) AS wallet_txs,
        MIN(tx.block_time) AS first_seen_30d
    FROM base_tx_30d tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1,2
),

top10_tx_share AS (
    SELECT
        project,
        ROUND(
            CAST(SUM(CASE WHEN rn <= 10 THEN wallet_txs ELSE 0 END) AS DOUBLE)
            / NULLIF(SUM(wallet_txs), 0) * 100
        , 1) AS top10_tx_share_pct
    FROM (
        SELECT
            project,
            wallet,
            wallet_txs,
            ROW_NUMBER() OVER (
                PARTITION BY project
                ORDER BY wallet_txs DESC
            ) AS rn
        FROM wallet_tx_30d
    ) w
    GROUP BY 1
),

dex_volume AS (
    SELECT
        tt.name AS project,
        SUM(dt.amount_usd) AS dex_volume_30d,
        COUNT(DISTINCT dt.taker) AS unique_traders_30d,
        SUM(CASE
              WHEN dt.block_time >= now() - interval '7' day
              THEN dt.amount_usd ELSE 0
            END) AS dex_volume_7d,
        SUM(CASE
              WHEN dt.block_time >= now() - interval '1' day
              THEN dt.amount_usd ELSE 0
            END) AS dex_volume_24h,
        SUM(CASE
              WHEN dt.block_time >= now() - interval '14' day
               AND dt.block_time < now() - interval '7' day
              THEN dt.amount_usd ELSE 0
            END) AS dex_volume_prev_7d
    FROM dex_trades_30d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
        OR dt.token_sold_address   = tt.address
    GROUP BY 1
),

-- First-buyer/seller lookback (split equi-joins — keep this pattern)
buyer_stats AS (
    SELECT
        tt.name AS project,
        dt.taker,
        MIN(dt.block_time) AS first_buy_time,
        MAX(CASE WHEN dt.block_time >= now() - interval '30' day THEN 1 ELSE 0 END) AS bought_30d,
        MAX(CASE WHEN dt.block_time >= now() - interval '7' day  THEN 1 ELSE 0 END) AS bought_7d,
        MAX(CASE WHEN dt.block_time >= now() - interval '1' day  THEN 1 ELSE 0 END) AS bought_24h
    FROM dex_trades_90d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
    GROUP BY 1, 2
),

seller_stats AS (
    SELECT
        tt.name AS project,
        dt.taker,
        MIN(dt.block_time) AS first_sell_time,
        MAX(CASE WHEN dt.block_time >= now() - interval '7' day THEN 1 ELSE 0 END) AS sold_7d,
        MAX(CASE WHEN dt.block_time >= now() - interval '1' day THEN 1 ELSE 0 END) AS sold_24h
    FROM dex_trades_90d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_sold_address = tt.address
    GROUP BY 1, 2
),

buyer_agg AS (
    SELECT
        project,
        COUNT(DISTINCT CASE WHEN bought_30d = 1 THEN taker END) AS buyers_30d,
        COUNT(DISTINCT CASE WHEN bought_7d = 1 THEN taker END) AS buyers_7d,
        COUNT(DISTINCT CASE WHEN bought_24h = 1 THEN taker END) AS buyers_24h,
        COUNT(DISTINCT CASE WHEN first_buy_time >= now() - interval '30' day THEN taker END) AS first_buyers_30d,
        COUNT(DISTINCT CASE WHEN first_buy_time >= now() - interval '7' day THEN taker END) AS first_buyers_7d,
        COUNT(DISTINCT CASE WHEN first_buy_time >= now() - interval '1' day THEN taker END) AS first_buyers_24h
    FROM buyer_stats
    GROUP BY 1
),

seller_agg AS (
    SELECT
        project,
        COUNT(DISTINCT CASE WHEN sold_7d = 1 THEN taker END) AS sellers_7d,
        COUNT(DISTINCT CASE WHEN sold_24h = 1 THEN taker END) AS sellers_24h,
        COUNT(DISTINCT CASE WHEN first_sell_time >= now() - interval '30' day THEN taker END) AS first_sellers_30d,
        COUNT(DISTINCT CASE WHEN first_sell_time >= now() - interval '7' day THEN taker END) AS first_sellers_7d,
        COUNT(DISTINCT CASE WHEN first_sell_time >= now() - interval '1' day THEN taker END) AS first_sellers_24h
    FROM seller_stats
    GROUP BY 1
),

buyers_sellers AS (
    SELECT
        COALESCE(b.project, s.project) AS project,
        COALESCE(b.buyers_30d, 0) AS buyers_30d,
        COALESCE(b.buyers_7d, 0) AS buyers_7d,
        COALESCE(b.buyers_24h, 0) AS buyers_24h,
        COALESCE(b.first_buyers_30d, 0) AS first_buyers_30d,
        COALESCE(b.first_buyers_7d, 0) AS first_buyers_7d,
        COALESCE(b.first_buyers_24h, 0) AS first_buyers_24h,
        COALESCE(s.first_sellers_30d, 0) AS first_sellers_30d,
        COALESCE(s.first_sellers_7d, 0) AS first_sellers_7d,
        COALESCE(s.first_sellers_24h, 0) AS first_sellers_24h,
        COALESCE(s.sellers_7d, 0) AS sellers_7d,
        COALESCE(s.sellers_24h, 0) AS sellers_24h
    FROM buyer_agg b
    FULL OUTER JOIN seller_agg s ON b.project = s.project
),

retention AS (
    SELECT
        this_week.project,
        COUNT(DISTINCT this_week.wallet) AS users_this_week,
        COUNT(DISTINCT last_week.wallet) AS retained_from_last_week
    FROM (
        SELECT DISTINCT tt.name AS project, tx."from" AS wallet
        FROM base_tx_7d tx
        INNER JOIN tracked_tokens tt
            ON tx."to" = tt.address
    ) this_week
    LEFT JOIN (
        SELECT DISTINCT tt.name AS project, tx."from" AS wallet
        FROM base_tx_14_7 tx
        INNER JOIN tracked_tokens tt
            ON tx."to" = tt.address
    ) last_week
      ON this_week.project = last_week.project
     AND this_week.wallet = last_week.wallet
    GROUP BY 1
),

avg_txs_returning AS (
    SELECT
        w.project,
        AVG(w.wallet_txs) AS avg_txs_returning_7d
    FROM (
        SELECT
            tt.name AS project,
            tx."from" AS wallet,
            COUNT(*) AS wallet_txs
        FROM base_tx_7d tx
        INNER JOIN tracked_tokens tt
            ON tx."to" = tt.address
        WHERE EXISTS (
              SELECT 1
              FROM base_tx_14_7 tx2
              WHERE tx2."to" = tx."to"
                AND tx2."from" = tx."from"
          )
        GROUP BY 1,2
    ) w
    GROUP BY 1
),

whale_thresholds AS (
    SELECT
        tt.name AS project,
        GREATEST(approx_percentile(dt.amount_usd, 0.9), 100) AS whale_min_usd,
        GREATEST(approx_percentile(dt.amount_usd, 0.99), 1000) AS hump_min_usd
    FROM dex_trades_30d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
        OR dt.token_sold_address   = tt.address
    GROUP BY 1
),

-- Same 7d scan; 24h metrics are CASE filters (no extra table scan)
whale_flow AS (
    SELECT
        tt.name AS project,
        SUM(CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_buy_usd_7d,
        SUM(CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_sell_usd_7d,
        COUNT(DISTINCT CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_buyers_7d,
        COUNT(DISTINCT CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_sellers_7d,
        SUM(CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_buy_usd_7d,
        SUM(CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_sell_usd_7d,
        COUNT(DISTINCT CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_buyers_7d,
        COUNT(DISTINCT CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_sellers_7d,
        SUM(CASE WHEN dt.token_bought_address = tt.address THEN dt.amount_usd ELSE 0 END) AS total_buy_usd_7d,
        SUM(CASE WHEN dt.token_sold_address   = tt.address THEN dt.amount_usd ELSE 0 END) AS total_sell_usd_7d,

        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_buy_usd_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_sell_usd_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_buyers_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_sellers_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_buy_usd_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_sell_usd_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_buyers_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_sellers_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_bought_address = tt.address THEN dt.amount_usd ELSE 0 END) AS total_buy_usd_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_sold_address = tt.address THEN dt.amount_usd ELSE 0 END) AS total_sell_usd_24h,

        MAX(wt.whale_min_usd) AS whale_min_usd,
        MAX(wt.hump_min_usd) AS hump_min_usd
    FROM dex_trades_7d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
        OR dt.token_sold_address   = tt.address
    INNER JOIN whale_thresholds wt
        ON wt.project = tt.name
    GROUP BY 1
),

combined AS (
    SELECT
        m30.project AS "Project",
        m30.symbol AS "Symbol",
        m30.address AS "Address",
        m30.tag AS "Tag",
        COALESCE(m30.txs_30d, 0) AS "Txs 30d",
        COALESCE(m7.txs_7d, 0) AS "Txs 7d",
        COALESCE(m24.txs_24h, 0) AS "Txs 24h",
        COALESCE(m30.users_30d, 0) AS "Wallets 30d",
        COALESCE(m7.users_7d, 0) AS "Wallets 7d",
        COALESCE(m24.users_24h, 0) AS "Wallets 24h",
        -- FIX: Txs/User was previously 7d data under a 30d-looking name
        COALESCE(m30.avg_txs_per_wallet_30d, 0) AS "TxsUser",
        COALESCE(m7.avg_txs_per_wallet_7d, 0) AS "TxsUser 7d",
        COALESCE(m24.avg_txs_per_wallet_24h, 0) AS "TxsUser 24h",
        COALESCE(nr.new_wallets_30d, 0) AS "New 30d",
        COALESCE(nr.returning_wallets_30d, 0) AS "Return 30d",
        CASE
            WHEN COALESCE(m30.users_30d, 0) = 0 THEN 0
            ELSE ROUND(100.0 * COALESCE(nr.new_wallets_30d, 0) / m30.users_30d, 1)
        END AS "New Wallet %",
        CASE
            WHEN COALESCE(ret.users_this_week, 0) = 0 THEN 0
            ELSE ROUND(100.0 * COALESCE(ret.retained_from_last_week, 0) / ret.users_this_week, 1)
        END AS "Retention",
        ROUND(COALESCE(avgret.avg_txs_returning_7d, 0), 2) AS "Avg Txs Ret",
        ROUND(COALESCE(t10.top10_tx_share_pct, 0), 1) AS "Top10",
        ROUND(COALESCE(dv.dex_volume_30d, 0), 2) AS "Vol 30d",
        ROUND(COALESCE(dv.dex_volume_7d, 0), 2) AS "Vol 7d",
        ROUND(COALESCE(dv.dex_volume_24h, 0), 2) AS "Vol 24h",
        ROUND(
            COALESCE(dv.dex_volume_30d, 0) / NULLIF(COALESCE(m30.txs_30d, 0), 0)
        , 2) AS "VolTx",
        ROUND(
            COALESCE(dv.dex_volume_7d, 0) / NULLIF(COALESCE(m7.txs_7d, 0), 0)
        , 2) AS "VolTx 7d",
        ROUND(
            COALESCE(dv.dex_volume_24h, 0) / NULLIF(COALESCE(m24.txs_24h, 0), 0)
        , 2) AS "VolTx 24h",
        ROUND(
            COALESCE(dv.dex_volume_30d, 0) / NULLIF(COALESCE(m30.users_30d, 0), 0)
        , 2) AS "VolWlt",
        ROUND(
            COALESCE(dv.dex_volume_7d, 0) / NULLIF(COALESCE(m7.users_7d, 0), 0)
        , 2) AS "VolWlt 7d",
        ROUND(
            COALESCE(dv.dex_volume_24h, 0) / NULLIF(COALESCE(m24.users_24h, 0), 0)
        , 2) AS "VolWlt 24h",
        COALESCE(dv.unique_traders_30d, 0) AS "Traders",
        COALESCE(bs.buyers_30d, 0) AS "Buyers 30d",
        COALESCE(bs.buyers_7d, 0) AS "Buyers 7d",
        COALESCE(bs.buyers_24h, 0) AS "Buyers 24h",
        COALESCE(bs.first_buyers_30d, 0) AS "1st Buyers 30d",
        COALESCE(bs.first_buyers_7d, 0) AS "1st Buyers 7d",
        COALESCE(bs.first_buyers_24h, 0) AS "1st Buyers 24h",
        COALESCE(bs.first_sellers_30d, 0) AS "1st Sellers 30d",
        COALESCE(bs.first_sellers_7d, 0) AS "1st Sellers 7d",
        COALESCE(bs.first_sellers_24h, 0) AS "1st Sellers 24h",
        ROUND(
            CAST(COALESCE(bs.buyers_7d, 0) AS DOUBLE)
            / NULLIF(COALESCE(bs.sellers_7d, 0), 0)
        , 2) AS "Buy/Sell Ratio",
        ROUND(
            CAST(COALESCE(bs.buyers_24h, 0) AS DOUBLE)
            / NULLIF(COALESCE(bs.sellers_24h, 0), 0)
        , 2) AS "Buy/Sell Ratio 24h",
        GREATEST(
            COALESCE(nr.new_wallets_30d, 0) - COALESCE(bs.first_buyers_30d, 0) - COALESCE(bs.first_sellers_30d, 0),
            0
        ) AS "Non-Trade New 30d",

        ROUND(COALESCE(wf.whale_buy_usd_7d, 0) - COALESCE(wf.whale_sell_usd_7d, 0), 2) AS "Whale Net 7d",
        ROUND(COALESCE(wf.whale_buy_usd_24h, 0) - COALESCE(wf.whale_sell_usd_24h, 0), 2) AS "Whale Net 24h",
        CASE
            WHEN COALESCE(wf.whale_buy_usd_7d, 0) + COALESCE(wf.whale_sell_usd_7d, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.whale_buy_usd_7d
                / (wf.whale_buy_usd_7d + wf.whale_sell_usd_7d)
            , 1)
        END AS "Accum %",
        CASE
            WHEN COALESCE(wf.whale_buy_usd_24h, 0) + COALESCE(wf.whale_sell_usd_24h, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.whale_buy_usd_24h
                / (wf.whale_buy_usd_24h + wf.whale_sell_usd_24h)
            , 1)
        END AS "Accum % 24h",
        COALESCE(wf.whale_buyers_7d, 0) AS "Whale Buyers 7d",
        COALESCE(wf.whale_sellers_7d, 0) AS "Whale Sellers 7d",
        COALESCE(wf.whale_buyers_24h, 0) AS "Whale Buyers 24h",
        COALESCE(wf.whale_sellers_24h, 0) AS "Whale Sellers 24h",
        ROUND(COALESCE(wf.hump_buy_usd_7d, 0) - COALESCE(wf.hump_sell_usd_7d, 0), 2) AS "Hump Net 7d",
        ROUND(COALESCE(wf.hump_buy_usd_24h, 0) - COALESCE(wf.hump_sell_usd_24h, 0), 2) AS "Hump Net 24h",
        ROUND(
            (COALESCE(wf.total_buy_usd_7d, 0) - COALESCE(wf.total_sell_usd_7d, 0))
            - (COALESCE(wf.whale_buy_usd_7d, 0) - COALESCE(wf.whale_sell_usd_7d, 0))
        , 2) AS "Retail Net 7d",
        ROUND(
            (COALESCE(wf.total_buy_usd_24h, 0) - COALESCE(wf.total_sell_usd_24h, 0))
            - (COALESCE(wf.whale_buy_usd_24h, 0) - COALESCE(wf.whale_sell_usd_24h, 0))
        , 2) AS "Retail Net 24h",
        CASE
            WHEN COALESCE(wf.total_buy_usd_7d, 0) + COALESCE(wf.total_sell_usd_7d, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * (COALESCE(wf.whale_buy_usd_7d, 0) + COALESCE(wf.whale_sell_usd_7d, 0))
                / (wf.total_buy_usd_7d + wf.total_sell_usd_7d)
            , 1)
        END AS "Whale Vol %",
        CASE
            WHEN COALESCE(wf.total_buy_usd_24h, 0) + COALESCE(wf.total_sell_usd_24h, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * (COALESCE(wf.whale_buy_usd_24h, 0) + COALESCE(wf.whale_sell_usd_24h, 0))
                / (wf.total_buy_usd_24h + wf.total_sell_usd_24h)
            , 1)
        END AS "Whale Vol % 24h",
        CASE
            WHEN COALESCE(wf.total_buy_usd_7d, 0) + COALESCE(wf.total_sell_usd_7d, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.total_buy_usd_7d / (wf.total_buy_usd_7d + wf.total_sell_usd_7d)
            , 1)
        END AS "Buy Vol %",
        CASE
            WHEN COALESCE(wf.total_buy_usd_24h, 0) + COALESCE(wf.total_sell_usd_24h, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.total_buy_usd_24h / (wf.total_buy_usd_24h + wf.total_sell_usd_24h)
            , 1)
        END AS "Buy Vol % 24h",
        ROUND(COALESCE(wf.whale_min_usd, 0), 0) AS "Whale Min $",
        ROUND(COALESCE(wf.hump_min_usd, 0), 0) AS "Hump Min $",
        COALESCE(wf.hump_buyers_7d, 0) AS "Hump Buyers 7d",
        COALESCE(wf.hump_sellers_7d, 0) AS "Hump Sellers 7d",
        COALESCE(wf.hump_buyers_24h, 0) AS "Hump Buyers 24h",
        COALESCE(wf.hump_sellers_24h, 0) AS "Hump Sellers 24h",
        COALESCE(
            ROUND(
                CASE
                    WHEN COALESCE(dv.dex_volume_prev_7d, 0) = 0 THEN NULL
                    ELSE 100.0 * (COALESCE(dv.dex_volume_7d, 0) - dv.dex_volume_prev_7d) / dv.dex_volume_prev_7d
                END,
                1
            ),
            0
        ) AS "Vol Grw",
        COALESCE(
            ROUND(
                CASE
                    WHEN COALESCE(mp7.txs_prev_7d, 0) = 0 THEN NULL
                    ELSE 100.0 * (COALESCE(m7.txs_7d, 0) - mp7.txs_prev_7d) / mp7.txs_prev_7d
                END,
                1
            ),
            0
        ) AS "Tx Grw",
        COALESCE(
            ROUND(
                CASE
                    WHEN COALESCE(mp7.users_prev_7d, 0) = 0 THEN NULL
                    ELSE 100.0 * (COALESCE(m7.users_7d, 0) - mp7.users_prev_7d) / mp7.users_prev_7d
                END,
                1
            ),
            0
        ) AS "User Grw"
    FROM metrics_30d m30
    LEFT JOIN metrics_7d m7 ON m30.project = m7.project
    LEFT JOIN metrics_24h m24 ON m30.project = m24.project
    LEFT JOIN metrics_prev_7d mp7 ON m30.project = mp7.project
    LEFT JOIN new_vs_returning nr ON m30.project = nr.project
    LEFT JOIN top10_tx_share t10 ON m30.project = t10.project
    LEFT JOIN dex_volume dv ON m30.project = dv.project
    LEFT JOIN buyers_sellers bs ON m30.project = bs.project
    LEFT JOIN retention ret ON m30.project = ret.project
    LEFT JOIN avg_txs_returning avgret ON m30.project = avgret.project
    LEFT JOIN whale_flow wf ON m30.project = wf.project
),

scored AS (
    SELECT
        *,
        ROUND(
            0.25 * COALESCE("New Wallet %", 0) +
            0.25 * COALESCE((GREATEST(-100, LEAST(200, "Tx Grw")) + GREATEST(-100, LEAST(200, "User Grw")) + GREATEST(-100, LEAST(200, COALESCE("Vol Grw",0)))) / 3, 0) +
            0.20 * COALESCE("Retention", 0) +
            0.15 * LEAST(COALESCE("VolTx", 0) / 1000, 100) +
            0.10 * LEAST(COALESCE("VolWlt", 0) / 5000, 100) +
            0.03 * (100 - COALESCE("Top10", 100)) +
            0.02 * LEAST(COALESCE("TxsUser", 0) * 10, 100)
        , 1) AS "Mom",

        ROUND(
            0.10 * COALESCE("New Wallet %", 0) +
            0.15 * COALESCE((GREATEST(-100, LEAST(200, "Tx Grw")) + GREATEST(-100, LEAST(200, "User Grw")) + GREATEST(-100, LEAST(200, COALESCE("Vol Grw",0)))) / 3, 0) +
            0.30 * COALESCE("Retention", 0) +
            0.25 * (
                0.5 * LEAST(COALESCE("VolTx", 0) / 1000, 100) +
                0.5 * LEAST(COALESCE("VolWlt", 0) / 5000, 100)
            ) +
            0.15 * LEAST(COALESCE("Avg Txs Ret", 0) * 10, 100) +
            0.03 * (100 - COALESCE("Top10", 100)) +
            0.02 * LEAST(COALESCE("TxsUser", 0) * 10, 100)
        , 1) AS "Sus"
    FROM combined
),

final AS (
    SELECT
        *,
        ROUND(
            GREATEST(
                0,
                100
                - CASE WHEN COALESCE("Tx Grw",0) - COALESCE("User Grw",0) > 50 THEN 20 ELSE 0 END
                - CASE WHEN COALESCE("Top10",0) > 60 THEN 20 ELSE 0 END
                - CASE WHEN COALESCE("Retention",0) > 150 THEN 20 ELSE 0 END
            )
        , 1) AS "Qlty",

        ROUND(
            LEAST(
                100,
                0.65 * LEAST(COALESCE("VolWlt", 0) / 10000 * 100, 100)
                + 0.35 * COALESCE("Top10", 0)
            )
        , 1) AS "Risk"
    FROM scored
)

SELECT
    "Project",
    "Symbol",
    "Address",
    "Tag",

    ROW_NUMBER() OVER (
        ORDER BY
            (0.5 * "Mom" + 0.5 * "Sus") * ("Qlty" / 100.0) * (1 - "Risk" / 100.0) DESC
    ) AS "O Rk",
    ROUND(
        (0.5 * "Mom" + 0.5 * "Sus") * ("Qlty" / 100.0) * (1 - "Risk" / 100.0),
        1
    ) AS "Opp",

    ROW_NUMBER() OVER (ORDER BY "Mom" DESC) AS "M Rk",
    "Mom",
    ROW_NUMBER() OVER (ORDER BY "Sus" DESC) AS "S Rk",
    "Sus",

    CASE
        WHEN "Mom" >= approx_percentile("Mom", 0.5) OVER ()
         AND "Sus" >= approx_percentile("Sus", 0.5) OVER ()
            THEN 'Breakout'
        WHEN "Mom" >= approx_percentile("Mom", 0.5) OVER ()
         AND "Sus" <  approx_percentile("Sus", 0.5) OVER ()
            THEN 'Quick Mover'
        WHEN "Mom" <  approx_percentile("Mom", 0.5) OVER ()
         AND "Sus" >= approx_percentile("Sus", 0.5) OVER ()
            THEN 'Slow Burner'
        ELSE 'Cold'
    END AS "Prof",

    ROUND("Qlty",      1) AS "Qlty %",
    ROUND("Risk",      1) AS "Risk %",
    "Vol 30d",
    "Vol 7d",
    "Vol 24h",
    ROUND("VolTx",   2) AS "Vol/Tx",
    ROUND("VolTx 7d", 2) AS "Vol/Tx 7d",
    ROUND("VolTx 24h", 2) AS "Vol/Tx 24h",
    ROUND("VolWlt",  2) AS "Vol/Wlt",
    ROUND("VolWlt 7d", 2) AS "Vol/Wlt 7d",
    ROUND("VolWlt 24h", 2) AS "Vol/Wlt 24h",
    ROUND("Vol Grw", 1) AS "Vol Grw %",
    "Txs 30d",
    "Txs 7d",
    "Txs 24h",
    ROUND("Tx Grw",  1) AS "Tx Grw %",
    ROUND("TxsUser", 2) AS "Txs/User",
    ROUND("TxsUser 7d", 2) AS "Txs/User 7d",
    ROUND("TxsUser 24h", 2) AS "Txs/User 24h",
    "Wallets 30d",
    "Wallets 7d",
    "Wallets 24h",
    ROUND("User Grw", 1) AS "User Grw %",
    "New 30d",
    "Return 30d",
    ROUND("New Wallet %", 1) AS "New Wallet %",
    ROUND("Retention",     1) AS "Retention %",
    "Avg Txs Ret",
    "Traders",
    "Buyers 30d",
    "Buyers 7d",
    "Buyers 24h",
    "1st Buyers 30d",
    "1st Buyers 7d",
    "1st Buyers 24h",
    "1st Sellers 30d",
    "1st Sellers 7d",
    "1st Sellers 24h",
    "Buy/Sell Ratio",
    "Buy/Sell Ratio 24h",
    "Whale Net 7d",
    "Whale Net 24h",
    "Accum %",
    "Accum % 24h",
    "Whale Buyers 7d",
    "Whale Sellers 7d",
    "Whale Buyers 24h",
    "Whale Sellers 24h",
    "Hump Net 7d",
    "Hump Net 24h",
    "Hump Buyers 7d",
    "Hump Sellers 7d",
    "Hump Buyers 24h",
    "Hump Sellers 24h",
    "Retail Net 7d",
    "Retail Net 24h",
    "Whale Vol %",
    "Whale Vol % 24h",
    "Buy Vol %",
    "Buy Vol % 24h",
    "Whale Min $",
    "Hump Min $",
    "Non-Trade New 30d",
    ROUND("Top10", 1) AS "Top10 %",
    COALESCE(DATE_DIFF('day', CAST(ta.deployed_at AS DATE), CURRENT_DATE), 0) AS "Token Age Days",
    "Project"   AS "Project ↪"
FROM final
LEFT JOIN token_ages ta
    ON LOWER(CAST(final."Address" AS VARCHAR)) = LOWER(CAST(ta.age_address AS VARCHAR))
ORDER BY "Opp" DESC
LIMIT 200;
